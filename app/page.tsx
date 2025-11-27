export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-4">
          Welcome to Chat App
        </h1>
        <p className="text-center text-lg mb-8">
          A modern real-time chat application
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/api/auth/signin"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Sign In
          </a>
        </div>
      </div>
    </main>
  )
}
