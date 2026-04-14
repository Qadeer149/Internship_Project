export default function Header() {
  return (
    <div className="flex flex-col items-center mb-8 sm:mb-10 w-full relative pt-12 sm:pt-4">
      <div className="absolute top-0 left-0 sm:left-4 flex items-center space-x-3 mt-2 hover:scale-105 transition-transform duration-300">
        <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-white/20">
          MQ
        </div>
        <span className="text-gray-300 text-xs sm:text-sm tracking-widest uppercase font-bold drop-shadow-md">
          Mohammed Qadeer
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white text-center drop-shadow-lg mt-4 sm:mt-0 leading-tight">
        📊 AI Data Analyst Dashboard
      </h1>
    </div>
  );
}
