export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse">
      <div className="h-8 w-64 bg-gray-200 rounded mb-4"/>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({length:4}).map((_,i)=> (
          <div key={i} className="h-24 rounded-xl bg-gray-100"/>
        ))}
      </div>
    </div>
  );
}
