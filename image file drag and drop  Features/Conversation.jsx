import MessageSkeleton from "./Conversation/MessageSkeleton";
import SidebarSkeleton from "./Conversation/SidebarSkeleton";
import NoChatSelected from "./Conversation/NoChatSelected";
import EmptyMessage from "./Conversation/EmptyMessage";
import EmptySidebar from "./Conversation/EmptySidebar";
import { useEffect, useRef, useState } from "react";
import "@fancyapps/ui/dist/fancybox/fancybox.css";
import { useLocation } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import { BsSendFill } from "react-icons/bs";
import { useSelector } from "react-redux";
import { Fancybox } from "@fancyapps/ui";
import Pusher from "pusher-js";
import axios from "axios";
import {
  chatMessageListApi,
  customerChatStart,
  sendMessageApi,
  chatListApi,
  api,
} from "../../Api/Api";
import {
  FaVolumeMute,
  FaArrowDown,
  FaPaperclip,
  FaRegImages,
  FaRegSmile,
  FaVolumeUp,
  FaSearch,
  FaBell,
} from "react-icons/fa";

const PUSHER_APP_CLUSTER = import.meta.env.VITE_PUSHER_APP_CLUSTER;
const PUSHER_APP_KEY = import.meta.env.VITE_PUSHER_APP_KEY;

// Allowed file types and size limits (5MB)
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const Conversation = () => {
  const loginToken = useSelector((state) => state.userData?.data?.token);
  const customerProfile = useSelector((state) => state.userData.data.customer);
  const [messageSentLoding, setMessageSentLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [mutedChats, setMutedChats] = useState([]);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const location = useLocation();
  const slug = location.state;

  const userId = customerProfile?.user_id; //logged in user's id

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Check if user has scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  useEffect(() => {
    // ✅ Use key & cluster from backend
    const pusher = new Pusher(PUSHER_APP_KEY, {
      cluster: PUSHER_APP_CLUSTER,
    });

    // ✅Subscribe to the channel that is broadcast on Laravel.
    const channel = pusher.subscribe("chat" + userId);

    // ✅ Bind the name of the Laravel event
    channel.bind("user.message", function (data) {
      console.log("📩 Real-time message:", data.data);

      // Format the incoming data to match your component's expected structure
      const formattedMessage = {
        message: data.data.message?.message || "",
        image:
          data.data.images?.map((img) => ({
            file_path: img.file_path,
            id: img.id,
          })) || [],
        file:
          data.data.files?.map((file) => ({
            file_path: file.file_path,
            id: file.id,
            name: file.file_path.split("/").pop(), // Extract filename from path
          })) || [],
        sent_by: data.data.message?.sent_by,
        created_at: data.data.message?.created_at || new Date().toISOString(),
        // Add other properties from the message object if needed
        ...data.data.message,
      };

      setMessages((prev) => [...prev, formattedMessage]);

      // Update chat list with the latest message in real-time
      if (data.data.chat_list_update) {
        setChatList((prev) => {
          const updatedList = prev.map((chat) => {
            if (chat.id === data.data.chat_list_update.id) {
              return {
                ...chat,
                message: data.data.chat_list_update.message,
                unread_count:
                  chat.id === activeChat?.id ? 0 : (chat.unread_count || 0) + 1,
              };
            }
            return chat;
          });

          // If the updated chat is not in the list, add it
          if (!prev.some((chat) => chat.id === data.data.chat_list_update.id)) {
            updatedList.unshift(data.data.chat_list_update);
          }

          return updatedList;
        });
      }
    });

    // cleanup
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [userId, activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load
  useEffect(() => {
    if (!slug) return;
    // Create or fetch chat based on slug
    setLoading(true);
    async function createChat() {
      try {
        const response = await axios.get(customerChatStart, {
          headers: {
            Authorization: `Bearer ${loginToken}`,
            "Content-Type": "application/json",
          },
          params: { slug: slug },
        });
        setLoading(false);
        setActiveChat(response.data.active_chat || {});
        setChatList(response.data?.chat_list || []);

        // Load muted chats from localStorage or API
        const storedMutedChats = localStorage.getItem("mutedChats");
        if (storedMutedChats) {
          setMutedChats(JSON.parse(storedMutedChats));
        }
      } catch (error) {
        console.error(
          "Chat Create Error:",
          error.response?.data || error.message
        );
        throw error;
      }
    }
    createChat();
  }, [slug, loginToken]);

  // Save muted chats to localStorage
  useEffect(() => {
    localStorage.setItem("mutedChats", JSON.stringify(mutedChats));
  }, [mutedChats]);

  // Load Chat List
  useEffect(() => {
    if (slug) return;
    setLoading(true);
    // Fetch chat list
    const fetchChatList = async () => {
      try {
        const res = await axios.get(chatListApi, {
          headers: {
            Authorization: `Bearer ${loginToken}`,
          },
        });
        setLoading(false);
        setChatList(res.data.chat_list || []);

        // Load muted chats from localStorage or API
        const storedMutedChats = localStorage.getItem("mutedChats");
        if (storedMutedChats) {
          setMutedChats(JSON.parse(storedMutedChats));
        }
      } catch (err) {
        console.error("Chat List Error:", err);
      }
    };
    fetchChatList();
  }, [loginToken, slug]);

  // Load Messages of a Chat
  const fetchMessages = async (id) => {
    setMessageLoading(true);
    try {
      const res = await axios.get(`${chatMessageListApi}=${id}`, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
      });
      setMessageLoading(false);
      setActiveChat(res?.data);
      setMessages(res?.data?.messages || []);

      // Mark messages as read when opening a chat
      if (res?.data?.id) {
        markAsRead(res.data.id);
      }
    } catch (err) {
      console.error("Messages Error:", err);
    }
  };

  // Handle selecting a chat
  const handleChatSelect = (chat) => {
    setActiveChat(chat);
    fetchMessages(chat.id);
  };

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessage((prevMessage) => prevMessage + emojiData.emoji);
  };

  // Validate file type and size
  const validateFile = (file, isImage = false) => {
    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;

    if (!allowedTypes.includes(file.type)) {
      alert(
        `Invalid file type. Please select ${
          isImage ? "an image" : "a document"
        } file.`
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File size too large. Maximum size is 5MB.");
      return false;
    }

    return true;
  };

  // Handle file selection with validation
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => validateFile(file, false));
    setSelectedFiles((prevFiles) => [...prevFiles, ...validFiles]);
    e.target.value = null; // Reset input to allow selecting same file again
  };

  // Handle image selection with validation
  const handleImageSelect = (e) => {
    const images = Array.from(e.target.files);
    const validImages = images.filter((image) => validateFile(image, true));
    setSelectedImages((prevImages) => [...prevImages, ...validImages]);
    e.target.value = null; // Reset input to allow selecting same file again
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const documentFiles = files.filter(
      (file) => !file.type.startsWith("image/")
    );

    const validImages = imageFiles.filter((image) => validateFile(image, true));
    const validFiles = documentFiles.filter((file) =>
      validateFile(file, false)
    );

    setSelectedImages((prevImages) => [...prevImages, ...validImages]);
    setSelectedFiles((prevFiles) => [...prevFiles, ...validFiles]);
  };

  // Remove selected file
  const removeFile = (index, isImage = false) => {
    if (isImage) {
      setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Send Message
  const sendMessage = async () => {
    if (
      (!message.trim() &&
        selectedImages.length === 0 &&
        selectedFiles.length === 0) ||
      !activeChat
    )
      return;

    setMessageSentLoading(true);

    try {
      // Prepare form data for file uploads
      const formData = new FormData();
      formData.append("id", activeChat.id);
      formData.append("message", message);

      // Append images
      selectedImages.forEach((image, index) => {
        formData.append(`image[${index}]`, image);
      });

      // Append files
      selectedFiles.forEach((file, index) => {
        formData.append(`file[${index}]`, file);
      });
      // Send message via API
      const res = await axios.post(sendMessageApi, formData, {
        headers: {
          Authorization: `Bearer ${loginToken}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Add new message to state
      const newMessage = {
        message,
        image: selectedImages.map((img) => URL.createObjectURL(img)),
        file: selectedFiles.map((file) => ({
          name: file.name,
          url: URL.createObjectURL(file),
        })),
        sent_by: 3,
        created_at: new Date().toISOString(),
      };

      setMessages([...messages, newMessage]);
      setMessage("");
      setSelectedFiles([]);
      setSelectedImages([]);

      // Update chat list with the latest message
      if (res.data.chat_list) {
        setChatList(res.data.chat_list);
      }
    } catch (err) {
      console.error("Send Message Error:", err);
    } finally {
      setMessageSentLoading(false);
    }
  };

  // Handle key press for sending message on Enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Filter chat list based on search term
  const filteredChatList = chatList.filter((chat) =>
    chat?.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    Fancybox.bind("[data-fancybox='gallery']", {
      Thumbs: false,
      Toolbar: true,
    });
  }, []);

  // 🔹 Handle outside click to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r flex flex-col">
        <div className="px-3 py-5 relative">
          <FaSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            // Skeleton Loader
            <SidebarSkeleton />
          ) : filteredChatList?.length === 0 ? (
            // Empty State
            <EmptySidebar />
          ) : (
            // Chat List
            filteredChatList?.map((chat) => (
              <div
                key={chat?.id}
                onClick={() => handleChatSelect(chat)}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer relative ${
                  activeChat?.id === chat?.id ? "bg-blue-50" : ""
                }`}
              >
                <img
                  src={`${api}/${chat?.logo}`}
                  alt={chat?.shop_name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://i.pravatar.cc/40?img=7";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm truncate">
                      {chat?.shop_name}
                    </h4>
                    {mutedChats.includes(chat.id) && (
                      <FaVolumeMute className="text-gray-400 text-xs" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {chat?.message?.message || "No messages yet"}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-gray-400">
                    {chat?.message?.created_at
                      ? new Date(chat?.message?.created_at).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )
                      : ""}
                  </span>
                  {chat.unread_count > 0 && (
                    <span className="bg-[#FA6219] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mt-1">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <img
                  src={`${api}/${activeChat?.logo}`}
                  alt={activeChat?.shop_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold">{activeChat?.shop_name}</h2>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
              {/* <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleMute(activeChat.id, !mutedChats.includes(activeChat.id))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {mutedChats.includes(activeChat.id) ? (
                    <FaVolumeMute size={18} />
                  ) : (
                    <FaVolumeUp size={18} />
                  )}
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <FaBell size={18} />
                </button>
              </div> */}
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto bg-gray-50 relative"
            >
              {messageLoading ? (
                // 🔹 Skeleton Loader
                <MessageSkeleton />
              ) : messages.length === 0 ? (
                // 🔹 Empty State
                <EmptyMessage />
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex mb-3 ${
                      msg?.sent_by === 3 ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                        msg?.sent_by === 3
                          ? "bg-[#FA6219] text-white"
                          : "bg-white border text-gray-800"
                      }`}
                    >
                      {/* Handle images from real-time data */}
                      {msg?.image && msg?.image.length > 0 && (
                        <div className="flex flex-col items-start mb-2">
                          {msg.image.map((img, idx) => (
                            <a
                              key={idx}
                              href={
                                img?.file_path ? `${api}/${img.file_path}` : img
                              }
                              data-fancybox="gallery"
                              className="group relative block overflow-hidden rounded-md"
                            >
                              <img
                                src={
                                  img?.file_path
                                    ? `${api}/${img.file_path}`
                                    : img
                                } // Handle both URL and object
                                alt="attachment"
                                className="mb-1 rounded max-w-full h-auto max-h-40 object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Handle files from real-time data */}
                      {msg?.file && msg?.file.length > 0 && (
                        <div className="flex flex-col items-start mb-2">
                          {msg.file.map((file, idx) => (
                            <a
                              key={idx}
                              href={`${api}/${file?.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-500 flex items-center"
                            >
                              <FaPaperclip className="mr-1" />
                              {file.file_path.split("/").pop()}{" "}
                              {/* Extract filename from path */}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Display message text if exists */}
                      {msg?.message && (
                        <p className={msg.image || msg.file ? "mt-2" : ""}>
                          {msg.message}
                        </p>
                      )}

                      <p className="text-[10px] text-right font-medium mt-1">
                        {new Date(msg?.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div ref={messagesEndRef} />
                  </div>
                ))
              )}

              {/* Scroll to bottom button */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className="sticky bottom-4 left-1/2 transform -translate-x-1/2 bg-[#FA6219] text-white p-2 rounded-full shadow-md hover:bg-[#e55a15] transition-colors"
                >
                  <FaArrowDown />
                </button>
              )}
            </div>

            {/* Selected files preview */}
            {(selectedImages?.length > 0 || selectedFiles?.length > 0) && (
              <div className="px-4 py-2 bg-white border-t flex flex-wrap gap-2">
                {selectedImages?.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="preview"
                      className="h-16 w-16 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeFile(index, true)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {selectedFiles?.map((file, index) => (
                  <div
                    key={index}
                    className="relative bg-gray-100 p-2 rounded flex items-center"
                  >
                    <FaPaperclip className="mr-1 text-gray-500" />
                    <span className="text-xs truncate max-w-xs">
                      {file?.name}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-2 text-red-500 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Box with drag and drop */}
            <div
              className={`p-3 border-t bg-white flex items-center gap-2 relative ${
                isDragOver ? "bg-blue-50" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragOver && (
                <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center rounded-lg z-10">
                  <p className="text-blue-600 font-medium">Drop files here</p>
                </div>
              )}

              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />

              <FaRegImages
                className="text-gray-500 text-xl cursor-pointer"
                onClick={() => imageInputRef.current.click()}
              />
              <FaPaperclip
                className="text-gray-500 text-xl cursor-pointer"
                onClick={() => fileInputRef.current.click()}
              />
              <div ref={emojiPickerRef} className="relative">
                <FaRegSmile
                  className="text-gray-500 text-xl cursor-pointer"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                />
                {showEmojiPicker && (
                  <div className="absolute bottom-10 left-0 z-10">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </div>
                )}
              </div>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Write Something..."
                className="flex-1 p-2 border rounded-full text-sm"
                disabled={messageSentLoding}
              />
              <button
                onClick={sendMessage}
                disabled={
                  messageSentLoding ||
                  (!message.trim() &&
                    selectedImages.length === 0 &&
                    selectedFiles.length === 0)
                }
                className="bg-[#FA6219] text-white p-3 rounded-full hover:bg-[#FA6219] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BsSendFill size={16} />
              </button>
            </div>
          </>
        ) : (
          // No chat selected
          <NoChatSelected />
        )}
      </div>
    </div>
  );
};

export default Conversation;
