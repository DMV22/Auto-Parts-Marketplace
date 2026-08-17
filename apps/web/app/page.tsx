export default function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-4 px-6 py-16"
    >
      <p className="text-sm font-medium text-muted-foreground">
        Frontend platform
      </p>
      <h1 className="text-balance text-3xl font-semibold tracking-tight">
        Auto Parts Marketplace
      </h1>
      <p className="max-w-xl text-pretty text-muted-foreground">
        Базова frontend-платформа готова до підключення продуктових сценаріїв.
      </p>
    </main>
  );
}
