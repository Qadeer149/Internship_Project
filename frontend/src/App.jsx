import { useState, useMemo } from "react";
import axios from "axios";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const COLORS = ['#60a5fa', '#34d399', '#a78bfa', '#f87171', '#fbbf24', '#fbbf24', '#818cf8'];

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  
  // ✨ State to track AI-derived variables (Axes, Text Insights, Chart Type, and Chat History)
  const [chartAxes, setChartAxes] = useState(null);
  const [chartType, setChartType] = useState("bar"); // Default chart type
  
  // Add an array to hold all the back-and-forth messages!
  const [chatHistory, setChatHistory] = useState([]);
  
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 🌐 Automatically switch between localhost for testing and your Render URL for production!
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      const res = await axios.post(`${API_BASE}/api/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setData(res.data.data);
      // Reset AI states when uploading a new file
      setChartAxes(null);
      setChartType("bar");
      // Give the chat an enthusiastic welcome message to kick off the interaction
      setChatHistory([
        { sender: 'ai', text: 'Data uploaded successfully! Ask me anything about it in plain English.' }
      ]);
    } catch (err) {
      console.error("Upload error details:", err);
      alert("Upload failed. Please ensure the backend server is running on port 5000.");
    }
  };

  // ✨ Using Gemini 3.0 Pro on the Backend Instead of the hardcoded query
  const handleAskAI = async () => {
    if (!query) return alert("Please type a question!");

    // Capture the question text, then add it to our history so we can see it later
    const userQuestion = query;
    setChatHistory(prev => [...prev, { sender: 'user', text: userQuestion }]);
    
    // Clear the input box specifically right away to give a snappier feeling UI
    setQuery("");

    try {
      setLoading(true);
      
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      
      // Wait for Gemini to think about it...
      const res = await axios.post(`${API_BASE}/api/ask-ai`, {
        question: userQuestion,
      });

      setData(res.data.result);
      
      // Store the exact axes the AI explicitly picked for the chart!
      if (res.data.axes) setChartAxes(res.data.axes);

      // Tell React which chart to render based on AI's logic
      if (res.data.chartType) setChartType(res.data.chartType);
      
      // Push the smart insight text we got back straight onto our growing timeline!
      if (res.data.insights) {
        setChatHistory(prev => [...prev, { sender: 'ai', text: res.data.insights }]);
      }

    } catch (err) {
      console.error("AI Error:", err);
      // Tell the user gracefully that it hit a snag if Gemini breaks down
      setChatHistory(prev => [...prev, { sender: 'ai', text: "Hmm, I couldn't process that query. The request might have been too complex."}]);
    } finally {
      setLoading(false);
    }
  };

  // ✨ Export Data to CSV
  const handleDownloadCSV = () => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvContent = [
      keys.join(","),
      ...data.map(row => keys.map(k => `"${String(row[k]).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "ai_dashboard_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✨ KPI Calculation Memory
  const kpiData = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const recordCount = data.length;
    let numericCols = [];
    
    // Find numeric columns
    const firstRow = data[0];
    Object.keys(firstRow).forEach(key => {
      const val = String(firstRow[key]).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
      if (val !== "" && !isNaN(Number(val))) {
        numericCols.push(key);
      }
    });

    let totalSum = 0;
    let topMetricStr = "N/A";
    
    if (numericCols.length > 0) {
      // Pick the first numeric column for the KPI
      const keyCol = numericCols[0];
      data.forEach(row => {
        const num = Number(String(row[keyCol]).replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) totalSum += num;
      });
      topMetricStr = `${keyCol}: ${totalSum >= 1000 ? (totalSum/1000).toFixed(1) + 'k' : totalSum.toFixed(0)}`;
    }

    return { recordCount, topMetricStr };
  }, [data]);

  // ✨ AI driven formatting: Uses the specific X and Y variables Gemini deemed most appropriate for your question!
  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    // If the Backend AI did not give us specific X/Y axes (like during the raw upload phase), try to guess intelligently.
    const keys = Object.keys(data[0]);
    let xAxisKey = keys[0];
    let yAxisKey = keys[1];

    if (chartAxes && chartAxes.x && chartAxes.y) {
      // ✅ We have precise instructions from the AI brain on what to plot!
      xAxisKey = chartAxes.x;
      yAxisKey = chartAxes.y;
    } else {
      // ⚠️ Basic fallback guessing system for raw tables
      const isStrictNumeric = (val) => {
        if (val === null || val === undefined || val === '') return false;
        const cleanVal = String(val).replace(/,/g, '').trim();
        return !isNaN(Number(cleanVal)); 
      };
      yAxisKey = keys.find(k => k !== xAxisKey && isStrictNumeric(data[0][k])) || keys[1] || xAxisKey;
    }
    
    // Safety processing so Recharts doesn't crash on string-encoded numbers
    const processedData = data.map(row => {
      const newRow = { ...row };
      if (newRow[yAxisKey]) {
        const strVal = String(newRow[yAxisKey]).replace(/,/g, '').replace(/[^0-9.-]/g, '').trim();
        if(!isNaN(Number(strVal)) && strVal !== "") {
             newRow[yAxisKey] = Number(strVal);
        } else {
             newRow[yAxisKey] = 0; // Provide a safe zero if data parsing fails on a row
        }
      }
      return newRow;
    });

    return { xAxisKey, yAxisKey, processedData };
  }, [data, chartAxes]);

  return (
    // 🎨 Main container: dark gradient theme, relative for the glow effect
    <div className="min-h-screen relative flex flex-col items-center p-8 text-white bg-gradient-to-br from-gray-950 via-blue-950 to-black font-sans overflow-hidden z-0">
      
      {/* ✨ Central White Glow/Shadow (subtle radial blur) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-white/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* 🔹 Header */}
      <h1 className="text-4xl md:text-5xl font-extrabold mb-10 mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white text-center drop-shadow-lg">
        📊 AI Data Analyst Dashboard
      </h1>

      {/* 🔹 Layout Grid for the Two Main Pillars: Upload & AI Analysis */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
        
        {/* === UPLOAD SECTION (Left side) === */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col h-full">
          <div className="flex-grow">
            <h2 className="text-2xl font-semibold text-blue-300 mb-2 border-b border-white/10 pb-3">
              📂 1. Data Source
            </h2>
            <p className="text-sm text-gray-400 mb-6 mt-2">
              Upload your dataset (CSV) to begin the analysis.
            </p>
            
            <div className="mb-6 bg-black/30 border border-white/5 rounded-xl p-4 flex justify-between items-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="block w-full text-sm text-gray-300 
                  file:mr-4 file:py-2.5 file:px-5 
                  file:rounded-xl file:border-0 
                  file:text-sm file:font-semibold 
                  file:bg-blue-600 file:text-white 
                  hover:file:bg-blue-500 hover:file:shadow-lg transition-all file:cursor-pointer cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 ease-in-out shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.6)] hover:-translate-y-1"
          >
            Upload Data
          </button>
        </div>

        {/* === AI CHAT UI SECTION (Right side) === */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col h-full relative h-[450px]">
          <h2 className="text-2xl font-semibold text-blue-300 mb-2 border-b border-white/10 pb-3 flex-shrink-0">
            🤖 2. Ask AI
          </h2>
          <p className="text-sm text-gray-400 mb-4 flex-shrink-0">
            Chat history & conversational analysis.
          </p>

          {/* 📜 Scrollable Chat History Container */}
          <div className="flex-grow flex flex-col mb-4 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-blue-600/50 scrollbar-track-transparent">
            {chatHistory.length === 0 ? (
              <div className="text-gray-500 text-sm text-center mt-10">Upload a dataset to start chatting!</div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl max-w-[85%] text-sm shadow-md animate-fade-in
                    ${msg.sender === 'user' 
                      ? 'bg-blue-600 text-white self-end ml-auto' 
                      : 'bg-black/50 border border-blue-500/30 text-blue-100 self-start mr-auto'
                    }`}
                >
                  <span className="text-[10px] uppercase font-bold opacity-60 block mb-1">
                    {msg.sender === 'user' ? 'You' : '🤖 AI Analyst'}
                  </span>
                  {msg.text}
                </div>
              ))
            )}
            
            {/* Loading Indicator inside the chat */}
            {loading && (
               <div className="p-3 rounded-xl max-w-[85%] text-sm shadow-md bg-black/50 border border-blue-500/30 text-blue-100 self-start mr-auto animate-pulse">
                <span className="text-[10px] uppercase font-bold opacity-60 block mb-1">🤖 AI Analyst</span>
                Thinking... ✨
               </div>
            )}
          </div>

          {/* ✍️ Bottom Input Box Area */}
          <div className="relative mt-auto flex-shrink-0">
            <textarea
              placeholder='e.g., "Show me the top 5 products by revenue..."'
              rows="2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleAskAI(); 
                } 
              }}
              className="w-full bg-black/40 border border-blue-500/30 rounded-xl pl-4 pr-16 py-3 text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none shadow-inner text-sm"
            ></textarea>
            
            {/* Send Button embedded inside the textarea */}
            <button
              onClick={handleAskAI}
              disabled={loading || !query.trim()}
              className={`absolute right-2 bottom-2 p-2 rounded-lg transition-all duration-300 
                ${(loading || !query.trim()) ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-500 shadow-lg hover:-translate-y-0.5'}
              `}
              title="Send to AI (Enter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* === DATA TABLE & CHARTS (Bottom Section) === */}
      {data.length > 0 && (
        <div className="w-full max-w-7xl mt-10 grid grid-cols-1 xl:grid-cols-3 gap-8 z-10">
          
          {/* KPI Cards Header Row */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <div className="bg-gradient-to-br from-indigo-900/50 to-blue-900/10 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
               <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Records</h4>
               <span className="text-3xl font-bold text-white drop-shadow-md">{kpiData?.recordCount || 0}</span>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/10 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md">
               <h4 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Active Metric</h4>
               <span className="text-3xl font-bold text-emerald-400 drop-shadow-md">{kpiData?.topMetricStr || 'N/A'}</span>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900/50 to-fuchsia-900/10 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-center">
               <button
                 onClick={handleDownloadCSV}
                 className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold py-3 rounded-xl transition-all shadow-lg text-sm tracking-wide"
               >
                 📥 Download Processed CSV
               </button>
            </div>
          </div>

          {/* Chart Section (Takes up 2/3 of the space on large screens) */}
          <div className="xl:col-span-2 w-full bg-black/50 backdrop-blur-2xl border border-white/5 p-8 rounded-3xl shadow-2xl flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <h3 className="text-2xl font-bold text-gray-200 flex items-center gap-2">
                📈 Data Visualization
              </h3>
              <span className="text-sm px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                AI Generated
              </span>
            </div>
            
            {/* Chart Container */}
            <div className="flex-grow w-full">
              {chartConfig && chartConfig.processedData ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                     <LineChart data={chartConfig.processedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                       <XAxis dataKey={chartConfig.xAxisKey} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} tickMargin={15} axisLine={false} tickLine={false} />
                       <YAxis stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value} />
                       <Tooltip cursor={{stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2}} contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }} labelStyle={{ color: '#d1d5db', marginBottom: '8px' }} />
                       <Line type="monotone" dataKey={chartConfig.yAxisKey} stroke="#34d399" strokeWidth={4} activeDot={{ r: 8, fill: '#34d399', stroke: '#111827', strokeWidth: 2 }} animationDuration={1500} />
                     </LineChart>
                  ) : chartType === 'pie' ? (
                     <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                       <Tooltip contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                       <Pie data={chartConfig.processedData} dataKey={chartConfig.yAxisKey} nameKey={chartConfig.xAxisKey} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} animationDuration={1500} label={false}>
                         {chartConfig.processedData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={2}/>
                         ))}
                       </Pie>
                     </PieChart>
                  ) : (
                    <BarChart data={chartConfig.processedData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" vertical={false} />
                      <XAxis 
                        dataKey={chartConfig.xAxisKey} 
                        stroke="#6b7280" 
                        tick={{fill: '#9ca3af', fontSize: 12}}
                        tickMargin={15}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        tick={{fill: '#9ca3af', fontSize: 12}}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                      />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.02)'}}
                        contentStyle={{ 
                          backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '16px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                        labelStyle={{ color: '#d1d5db', marginBottom: '8px' }}
                      />
                      <Bar 
                        dataKey={chartConfig.yAxisKey} 
                        fill="url(#colorUv)" 
                        radius={[8, 8, 0, 0]} 
                        animationDuration={1500}
                        maxBarSize={60}
                      />
                      
                      {/* Custom Gradient for the Bars */}
                      <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={1}/>
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex w-full h-full items-center justify-center text-gray-500">
                  Waiting for numeric AI analysis to generate charts...
                </div>
              )}
            </div>
          </div>

          {/* Table Section (Takes up 1/3 of the space on large screens) */}
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
                    {/* Maps through EVERYTHING dynamically, no more chopping data off */}
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

        </div>
      )}
    </div>
  );
}

export default App;