import { SplitContainer } from './SplitContainer'

export interface SplitRatios {
  main: number
  top: number
  bottom: number
}

export const DEFAULT_RATIOS: SplitRatios = { main: 0.5, top: 0.5, bottom: 0.5 }

interface PaneLayoutProps {
  panes: React.ReactNode[]
  ratios: SplitRatios
  onRatioChange: (key: keyof SplitRatios, value: number) => void
  className?: string
}

export function PaneLayout({ panes, ratios, onRatioChange, className = '' }: PaneLayoutProps) {
  if (panes.length === 0) return null

  if (panes.length === 1) {
    return <div className={`${className}`} style={{ width: '100%', height: '100%' }}>{panes[0]}</div>
  }

  if (panes.length === 2) {
    return (
      <SplitContainer
        direction="horizontal"
        ratio={ratios.top}
        onRatioChange={v => onRatioChange('top', v)}
        first={panes[0]}
        second={panes[1]}
        className={className}
      />
    )
  }

  if (panes.length === 3) {
    return (
      <SplitContainer
        direction="vertical"
        ratio={ratios.main}
        onRatioChange={v => onRatioChange('main', v)}
        first={
          <SplitContainer
            direction="horizontal"
            ratio={ratios.top}
            onRatioChange={v => onRatioChange('top', v)}
            first={panes[0]}
            second={panes[1]}
          />
        }
        second={panes[2]}
        className={className}
      />
    )
  }

  // 4 panes
  return (
    <SplitContainer
      direction="vertical"
      ratio={ratios.main}
      onRatioChange={v => onRatioChange('main', v)}
      first={
        <SplitContainer
          direction="horizontal"
          ratio={ratios.top}
          onRatioChange={v => onRatioChange('top', v)}
          first={panes[0]}
          second={panes[1]}
        />
      }
      second={
        <SplitContainer
          direction="horizontal"
          ratio={ratios.bottom}
          onRatioChange={v => onRatioChange('bottom', v)}
          first={panes[2]}
          second={panes[3]}
        />
      }
      className={className}
    />
  )
}
