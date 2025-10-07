const SidebarSkeleton = () => {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="h-2 w-8 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

export default SidebarSkeleton;
