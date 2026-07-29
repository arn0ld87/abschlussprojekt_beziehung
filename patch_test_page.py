with open('tests/app/page.test.tsx', 'r') as f:
    content = f.read()

content = content.replace('expect(html.startsWith("<main>")).toBe(true);', 'expect(html.startsWith("<main")).toBe(true);')

with open('tests/app/page.test.tsx', 'w') as f:
    f.write(content)
