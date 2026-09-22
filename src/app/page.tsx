import { auth, signIn, signOut } from "@/auth";

  export default async function HomePage() {
    const session = await auth();

    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-bold mb-6">Meetly Scheduling Platform</h1>
        {session?.user ? (
          <div className="flex flex-col items-center gap-4">
            <p>Welcome, <strong>{session.user.name}</strong> ({session.user.email})</p>
            {session.user.image && (
              <img src={session.user.image} alt="User Avatar" className="w-16 h-16 rounded-full" />
            )}
            <form action={async () => {
              "use server";
              await signOut();
            }}>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Sign Out
              </button>
            </form>
          </div>
        ) : (
          <form action={async () => {
            "use server";
            await signIn("google");
          }}>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Sign in with Google
            </button>
          </form>
        )}
      </main>
    );
  }