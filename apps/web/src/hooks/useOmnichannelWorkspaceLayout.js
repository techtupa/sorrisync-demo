import { useLayoutEffect, useRef } from 'react';

// Mede o espaço após os cabeçalhos; avisos e mudança de viewport não somam
// uma segunda altura de tela ao workspace. Não toca no estado da conversa.
export const useOmnichannelWorkspaceLayout = (activeMobilePanel) => {
  const pageRef = useRef(null);
  const navigationRef = useRef(null);
  const workspaceRef = useRef(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const navigation = navigationRef.current;
    const workspace = workspaceRef.current;
    if (!page || !navigation || !workspace) return undefined;

    const header = document.querySelector('header');
    const desktop = window.matchMedia('(min-width: 1280px)');
    let frame;
    let needsAlignment = true;
    const measure = () => {
      const headerHeight = header?.getBoundingClientRect().height || 0;
      page.style.setProperty('--omni-header-height', `${headerHeight}px`);
      workspace.style.marginTop = '0px';
      if (!desktop.matches && activeMobilePanel === 'conversation') {
        // Quando o aviso do topo some, a navegação fica sticky. Preserve o
        // intervalo até a conversa para não colocar o histórico atrás das abas.
        const overlap = navigation.getBoundingClientRect().bottom + 20 - workspace.getBoundingClientRect().top;
        workspace.style.marginTop = `${Math.max(0, overlap)}px`;
      }
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const top = desktop.matches
        ? workspace.getBoundingClientRect().top + window.scrollY
        : Math.max(headerHeight, workspace.getBoundingClientRect().top);
      workspace.style.setProperty('--omni-workspace-height', `${Math.max(240, viewportHeight - top - 16)}px`);
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Tabs monta o painel selecionado após o commit do componente pai.
        if (needsAlignment) alignConversation();
        needsAlignment = false;
        measure();
      });
    };

    // Ao abrir a conversa no celular, traz a navegação para baixo do cabeçalho.
    // A rolagem manual e a atualização da fila não repetem esse movimento.
    const alignConversation = () => {
      if (!desktop.matches && activeMobilePanel === 'conversation') {
        const headerHeight = header?.getBoundingClientRect().height || 0;
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        // Reserva a altura antes de rolar: a aba anterior pode ter deixado uma
        // altura curta, impedindo que o documento alcance o ponto de ancoragem.
        workspace.style.setProperty('--omni-workspace-height', `${Math.max(240, viewportHeight - headerHeight - navigation.offsetHeight - 44)}px`);
        window.scrollTo({ top: Math.max(0, navigation.getBoundingClientRect().top + window.scrollY - headerHeight - 8), behavior: 'instant' });
      }
    };
    const resize = () => {
      needsAlignment = true;
      scheduleMeasure();
    };
    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    if (header) observer.observe(header);
    observer.observe(page.firstElementChild);
    observer.observe(navigation);
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
    };
  }, [activeMobilePanel]);

  return { pageRef, navigationRef, workspaceRef };
};
