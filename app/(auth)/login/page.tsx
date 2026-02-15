export default function LoginPage() {
  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Welcome to Diurna</h1>
        <p className="text-muted-foreground mt-2">Sign in to your newsroom</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@publisher.com"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint"
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint"
          />
        </div>
        <button className="w-full rounded-lg bg-mint px-4 py-2.5 text-sm font-medium text-white hover:bg-mint-dark transition-colors">
          Sign In
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-mint hover:underline">Create one</a>
      </p>
    </div>
  )
}
