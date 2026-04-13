export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-white md:block">
        <div className="p-6">
          <h2 className="text-lg font-bold">SmartStock</h2>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
