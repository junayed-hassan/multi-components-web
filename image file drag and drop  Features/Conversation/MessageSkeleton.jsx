const MessageSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <div className="max-w-xs px-4 py-3 rounded-lg animate-pulse">
            <div className="h-3 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageSkeleton;
