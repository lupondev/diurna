export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <button className="rounded-lg bg-mint px-4 py-2 text-sm font-medium text-white hover:bg-mint-dark transition-colors">
          + Invite Member
        </button>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-center text-muted-foreground py-12">
          Invite your team to start collaborating.
        </p>
      </div>
    </div>
  )
}
