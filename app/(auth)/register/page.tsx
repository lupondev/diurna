export default function RegisterPage() {
  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Create your newsroom</h1>
        <p className="text-muted-foreground mt-2">Start publishing with AI in minutes</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium" htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="Harun"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint"
          />
        </div>
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
          <label className="text-sm font-medium" htmlFor="orgName">Publication Name</label>
          <input
            id="orgName"
            type="text"
            placeholder="Sport News BA"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mint"
          />
        </div>
        <button className="w-full rounded-lg bg-mint px-4 py-2.5 text-sm font-medium text-white hover:bg-mint-dark transition-colors">
          Create Newsroom
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <a href="/login" className="text-mint hover:underline">Sign in</a>
      </p>
    </div>
  )
}
