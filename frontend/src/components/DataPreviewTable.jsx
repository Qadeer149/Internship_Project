export default function DataPreviewTable({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="xl:col-span-1 w-full bg-black/50 backdrop-blur-2xl border border-white/5 p-8 rounded-3xl shadow-2xl flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <h3 className="text-xl font-bold text-gray-200">
          📋 Data Preview
        </h3>
        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">Scroll Right →</span>
      </div>
      
      {/* Scrollable Table Container */}
      <div className="overflow-x-auto overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-blue-600/50 scrollbar-track-transparent pb-3">
        <table className="min-w-full text-sm text-left text-gray-300">
          <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm shadow-sm z-10 text-blue-200 uppercase text-[10px] tracking-widest leading-loose">
            <tr>
              {/* Maps through EVERYTHING dynamically */}
              {Object.keys(data[0]).map((key) => ( 
                <th key={key} className="px-6 py-4 font-semibold border-b border-white/10 whitespace-nowrap">
                  {key}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors duration-150">
                {Object.values(row).map((val, j) => (
                  <td key={j} className="px-6 py-5 whitespace-nowrap text-gray-400">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
