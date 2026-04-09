import React from 'react'
import './Breadcrumb.css'

export interface BreadcrumbProps {
  filePath: string | null
  rootPath: string
}

export function Breadcrumb({ filePath, rootPath }: BreadcrumbProps): JSX.Element | null {
  if (!filePath) return null

  // Make path relative to workspace root
  let relativePath = filePath
  if (filePath.startsWith(rootPath)) {
    relativePath = filePath.slice(rootPath.length + 1)
  }

  const segments = relativePath.replace(/\\/g, '/').split('/')

  return (
    <div className="breadcrumb" data-testid="breadcrumb" aria-label="File path">
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="breadcrumb-separator">›</span>}
          <span
            className={`breadcrumb-segment${index === segments.length - 1 ? ' active' : ''}`}
          >
            {segment}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}
