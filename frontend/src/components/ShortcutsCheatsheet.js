import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const SECTIONS = [
  {
    title: 'Navegação',
    items: [
      { keys: ['G', 'D'], label: 'Dashboard' },
      { keys: ['G', 'M'], label: 'Mapa Mental' },
      { keys: ['G', 'S'], label: 'Score Geral' },
      { keys: ['G', 'P'], label: 'Pilares' },
      { keys: ['G', 'T'], label: 'Touchpoints' },
      { keys: ['G', 'R'], label: 'Relatórios' },
    ],
  },
  {
    title: 'Ações',
    items: [
      { keys: ['⌘', 'K'], label: 'Abrir command palette' },
      { keys: ['C'],      label: 'Criar (contextual)' },
      { keys: ['?'],      label: 'Mostrar atalhos' },
    ],
  },
  {
    title: 'Edição',
    items: [
      { keys: ['⌘', 'S'], label: 'Salvar agora' },
      { keys: ['Esc'],    label: 'Fechar modal / palette' },
    ],
  },
];

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded border border-border bg-muted text-[11px] font-medium font-mono text-foreground">
      {children}
    </kbd>
  );
}

export function ShortcutsCheatsheet({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]" data-testid="shortcuts-cheatsheet">
        <DialogHeader>
          <DialogTitle className="font-heading">Atalhos de teclado</DialogTitle>
          <DialogDescription>Navegue pela LaBrand mais rápido. Combos em sequência (ex.: <Kbd>G</Kbd> seguido de <Kbd>D</Kbd>) têm 1 segundo de janela.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-2">
          {SECTIONS.map(section => (
            <div key={section.title} className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{section.title}</p>
              <ul className="space-y-2.5">
                {section.items.map(item => (
                  <li key={item.label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-muted-foreground/60 text-xs">depois</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsCheatsheet;
