import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
const css = readFileSync(resolve(root, 'app/assets/css/main.css'), 'utf8')
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))

function fontsourceCss(name: string) {
  return readFileSync(resolve(root, 'node_modules/@fontsource-variable', name, 'index.css'), 'utf8')
}

describe('self-hosted fonts', () => {
  it('AC1: no Google Fonts host in main.css', () => {
    expect(css).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/)
  })

  it.each(['geist', 'geist-mono'])('AC2: @fontsource-variable/%s is an exact-pinned dependency', (name) => {
    expect(pkg.dependencies[`@fontsource-variable/${name}`]).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('AC2: the next-only geist package is gone', () => {
    expect(pkg.dependencies.geist).toBeUndefined()
  })

  it.each([
    ['geist', 'Geist Variable'],
    ['geist-mono', 'Geist Mono Variable'],
  ])('AC3: main.css imports @fontsource-variable/%s, a local variable font with swap', (name, family) => {
    expect(css).toContain(`@import "@fontsource-variable/${name}";`)
    const face = fontsourceCss(name)
    expect(face).toContain(`font-family: '${family}'`)
    expect(face).toMatch(/font-weight:\s*100 900/)
    expect(face).toMatch(/font-display:\s*swap/)
    expect(face).not.toMatch(/url\(['"]?https?:/)
  })

  it('AC4: font stacks start with the fontsource families', () => {
    expect(css).toMatch(/--font-sans:\s*'Geist Variable',\s*\S/)
    expect(css).toMatch(/--font-mono:\s*'Geist Mono Variable',\s*\S/)
  })
})
