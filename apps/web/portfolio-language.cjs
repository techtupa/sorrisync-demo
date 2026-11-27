module.exports = function portfolioLanguage({ types: t }) {
  function translate(path, node) {
    const program = path.findParent(parent => parent.isProgram());
    if (!program.getData('portfolioEnglish')) {
      program.setData('portfolioEnglish', program.scope.generateUidIdentifier('portfolioEnglish'));
      program.unshiftContainer('body', t.importDeclaration([t.importSpecifier(program.getData('portfolioEnglish'), t.identifier('english'))], t.stringLiteral('@/portfolio/english.js')));
    }
    return t.callExpression(program.getData('portfolioEnglish'), [node]);
  }
  const copy = new Set(['title', 'description', 'subtitle', 'label', 'placeholder', 'aria-label', 'alt', 'emptyMessage', 'hint', 'aria-description', 'aria-valuetext', 'caption', 'buttonLabel', 'loadingMessage', 'searchPlaceholder', 'tooltip']);
  return {

    visitor: {
      ImportDeclaration(path) {
        if (path.node.source.value !== 'sonner' || path.hub.file.opts.filename.endsWith('localizedToast.js')) return;
        const toast = path.node.specifiers.find(item => t.isImportSpecifier(item) && item.imported.name === 'toast');
        if (!toast) return;
        const localized = t.importDeclaration([toast], t.stringLiteral('@/portfolio/localizedToast.js'));
        const remaining = path.node.specifiers.filter(item => item !== toast);
        if (remaining.length === 0) {
          path.replaceWith(localized);
          return;
        }
        path.node.specifiers = remaining;
        path.insertAfter(localized);
      },
      CallExpression(path) {
        if (path.node.arguments.length === 0) return;
        const { callee } = path.node;
        if (t.matchesPattern(callee, 'window.confirm') || t.matchesPattern(callee, 'window.alert')) {
          path.node.arguments[0] = translate(path, path.node.arguments[0]);
        }
      },
      JSXText(path) {
        const normalized = path.node.value.replace(/\s+/g, ' ');
        if (!normalized.trim()) return;
        path.replaceWith(t.jsxExpressionContainer(translate(path, t.stringLiteral(normalized))));
        path.skip();
      },
      JSXExpressionContainer(path) {
        if (!path.parentPath.isJSXElement() || t.isJSXEmptyExpression(path.node.expression)) return;
        path.node.expression = translate(path, path.node.expression);
      },
      JSXAttribute(path) {
        if (!copy.has(path.node.name.name) || !path.node.value) return;
        const value = path.node.value;
        path.node.value = t.jsxExpressionContainer(translate(path, t.isStringLiteral(value) ? value : value.expression));
        path.skip();
      },
    },
  };
};
