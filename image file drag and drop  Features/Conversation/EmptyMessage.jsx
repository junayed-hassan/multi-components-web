function EmptyMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-14 w-14 mb-3 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 10h.01M12 14h.01M16 10h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9
             4.03-9 9-9 9 4.03 9 9z"
        />
      </svg>
      <p className="text-sm font-medium">No messages yet</p>
      <p className="text-xs text-gray-400">Start the conversation!</p>
    </div>
  );
}

export default EmptyMessage;
