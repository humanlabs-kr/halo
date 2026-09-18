type PageHeaderProps = {
  title: string;
  rightAction?: React.ReactNode;
}

function PageHeader({ title, rightAction }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">{title}</h1>
      {rightAction && <div>{rightAction}</div>}
    </header>
  )
}

export default PageHeader
