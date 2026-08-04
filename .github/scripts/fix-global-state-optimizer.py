from pathlib import Path

path = Path('.github/scripts/optimize-global-state.py')
text = path.read_text()
old = '''runtime = replace_count(
    runtime,
    '''\'''      props,
      stateRefs,
      asyncDataRefs'''\''',
    '''\'''      props,
      stateRefs,
      globalStateKeys,
      asyncDataRefs'''\''',
    2,
    "store global key sets",
)'''
new = '''runtime = replace_count(
    runtime,
    '''\'''    this.scopes[scopeId] = {
      id: scopeId,
      moduleId: definition.id,
      props,
      stateRefs,
      asyncDataRefs
    };'''\''',
    '''\'''    this.scopes[scopeId] = {
      id: scopeId,
      moduleId: definition.id,
      props,
      stateRefs,
      globalStateKeys,
      asyncDataRefs
    };'''\''',
    2,
    "store global key sets",
)'''
if text.count(old) != 1:
    raise RuntimeError(f'optimizer block mismatch: {text.count(old)}')
path.write_text(text.replace(old, new, 1))

for filename in [
    '.github/workflows/fix-global-state-optimizer.yml',
    '.github/scripts/fix-global-state-optimizer.py',
    '.github/workflows/diagnose-global-state.yml',
    '.github/scripts/diagnose-global-state.py',
    '.github/global-state-pattern-counts.txt',
]:
    Path(filename).unlink(missing_ok=True)
