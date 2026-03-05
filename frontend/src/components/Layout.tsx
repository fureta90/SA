import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="layout">
      <header>
        <nav>
          <h2>App</h2>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>&copy; 2024</p>
      </footer>
    </div>
  )
}
