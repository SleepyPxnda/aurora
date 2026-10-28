import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
const css = readFileSync(resolve(root, 'app/assets/css/main.css'), 'utf8')

function fontFace(family: string) {
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? []
  return blocks.find(b => b.includes(`font-family: '${family}'`))
}

function weightRange(block: string) {
  const m = block.match(/font-weight:\s*(\d+)\s+(\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

describe('self-hosted fonts', () => {
  it('AC1: no Google Fonts host in main.css', () => {
    expect(css).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })

  it('AC2: geist is an exact-pinned dependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    expect(pkg.dependencies.geist).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it.each([
    ['Geist', 400, 700],
    ['Geist Mono', 400, 600],
  ])('AC3: @font-face for %s', (family, min, max) => {
    const block = fontFace(family)
    expect(block).toBeDefined()
    const range = weightRange(block!)
    expect(range).not.toBeNull()
    expect(range![0]).toBeLessThanOrEqual(min)
    expect(range![1]).toBeGreaterThanOrEqual(max)
    expect(block).toMatch(/font-display:\s*swap/)
    const url = block!.match(/url\('~~\/([^']+\.woff2)'\)/)
    expect(url).not.toBeNull()
    expect(existsSync(resolve(root, url![1]!))).toBe(true)
  })

  it('AC4: font stacks start with the design-system families', () => {
    expect(css).toMatch(/--font-sans:\s*'Geist',\s*\S/)
    expect(css).toMatch(/--font-mono:\s*'Geist Mono',\s*\S/)
  })
})
