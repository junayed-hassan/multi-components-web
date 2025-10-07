function EmptySidebar() {
  return (
    <div className="p-6 text-center text-gray-500 flex flex-col items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 mb-3 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 8h10M7 12h4m1 8a9 9 0 100-18 9 9 0 000 18z"
        />
      </svg>
      <p className="text-sm">No chats found</p>
      <p className="text-xs text-gray-400">
        Start a conversation to see it here
      </p>
    </div>
  );
}

export default EmptySidebar;
