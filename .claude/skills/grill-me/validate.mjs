#!/usr/bin/env node
// Zero-dependency validator for project.spec.json.
// Usage: node validate.mjs [spec=project.spec.json] [schema=<this folder>/spec.schema.json]
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const specPath = process.argv[2] ?? 'project.spec.json'
const schemaPath = process.argv[3] ?? join(dirname(fileURLToPath(import.meta.url)), 'spec.schema.json')

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    console.error(`✘ ${path}: ${err.message}`)
    process.exit(2)
  }
}

const root = load(schemaPath)
const spec = load(specPath)
const errors = []

const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v)
const resolve = ref => ref.replace(/^#\//, '').split('/').reduce((node, key) => node[key], root)

function check(value, schema, path) {
  if (schema.$ref) schema = { ...resolve(schema.$ref), ...schema, $ref: undefined }
  const at = path || '(root)'

  if (schema.enum && !schema.enum.includes(value)) {
    return errors.push(`${at}: must be one of ${schema.enum.map(v => JSON.stringify(v)).join(', ')}`)
  }
  if (schema.type) {
    const actual = typeOf(value)
    const ok = actual === schema.type || (schema.type === 'number' && actual === 'integer')
    if (!ok) return errors.push(`${at}: expected ${schema.type}, got ${actual}`)
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      return errors.push(`${at}: is empty`)
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      const hint = schema.description ? ` (${schema.description})` : ''
      errors.push(`${at}: ${JSON.stringify(value)} does not match the required format${hint}`)
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${at}: must have at least ${schema.minItems} item(s)`)
    }
    if (schema.items) value.forEach((item, i) => check(item, schema.items, `${path}[${i}]`))
  }
  if (typeOf(value) === 'object') {
    const props = schema.properties ?? {}
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path ? path + '.' : ''}${key}: is required`)
    }
    for (const [key, child] of Object.entries(value)) {
      const sub = `${path ? path + '.' : ''}${key}`
      if (props[key]) check(child, props[key], sub)
      else if (schema.additionalProperties === false) errors.push(`${sub}: unknown field`)
    }
  }
}

check(spec, root, '')

const blocking = (spec.openQuestions ?? []).filter(q => q.blocking)
if (errors.length === 0) {
  console.log(`✔ ${specPath} is valid (status: ${spec.status})`)
  if (blocking.length) console.log(`  ${blocking.length} blocking open question(s) remain`)
  process.exit(0)
}
console.log(`✘ ${specPath}: ${errors.length} problem(s)`)
for (const e of errors) console.log(`  - ${e}`)
process.exit(1)
