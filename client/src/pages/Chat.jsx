import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, LogOut, Search, Check, CheckCheck, Settings, User } from 'lucide-react';
import io from 'socket.io-client';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const checkTokenValidity = () => {
    const token = localStorage.getItem('userToken');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= expiry) {
        localStorage.removeItem('userToken');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      localStorage.removeItem('userToken');
      return false;
    }
  };

  const fetchInitialData = async () => {
    try {
      const userToken = localStorage.getItem('userToken');
      if (!userToken) {
        navigate('/login');
        return;
      }

      setIsLoadingUsers(true);
      setIsLoadingMessages(true);
      setError('');

      // Fetch users first
      const usersResponse = await fetch('https://chat-app-be-nm69.onrender.com/api/users', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersResponse.json();
      
      // Get current user's ID from the token
      const tokenPayload = JSON.parse(atob(userToken.split('.')[1]));
      const currentUserId = tokenPayload.id;

      // Find current user and filter out from users list
      const currentUserData = usersData.find(user => user.id === currentUserId);
      if (currentUserData) {
        setCurrentUser(currentUserData);
        setUsers(usersData.filter(user => user.id !== currentUserId));
        console.log('Current user set:', currentUserData);
        console.log('Other users set:', usersData.filter(user => user.id !== currentUserId));
      }

      setIsLoadingUsers(false);

      // Only fetch messages if a user is selected
      if (selectedUser) {
        const messagesResponse = await fetch('https://chat-app-be-nm69.onrender.com/api/messages', {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });

        if (!messagesResponse.ok) {
          throw new Error('Failed to fetch messages');
        }

        const messagesData = await messagesResponse.json();
        
        // Filter messages for selected user
        const filteredMessages = messagesData.filter(msg => 
          (msg.sender_id === selectedUser.id && msg.recipient_id === currentUserId) ||
          (msg.sender_id === currentUserId && msg.recipient_id === selectedUser.id)
        );
        
        setMessages(filteredMessages);
        console.log('Messages set:', filteredMessages);
      }
    } catch (error) {
      console.error('Error in fetchInitialData:', error);
      setError(error.message);
      if (error.message.includes('Token expired') || error.message.includes('Invalid token')) {
        localStorage.removeItem('userToken');
        navigate('/login');
      }
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Main useEffect for socket connection
  useEffect(() => {
    if (!checkTokenValidity()) {
      navigate('/login');
      return;
    }

    const userToken = localStorage.getItem('userToken');

    // Connect to socket
    socketRef.current = io("https://chat-app-be-nm69.onrender.com", {
    auth: { token: userToken },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"], // Ensure WebSockets work
    withCredentials: true, // Important for CORS issues
  });

    // Socket event handlers
    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      setError('');
      // Call fetchInitialData after successful socket connection
      fetchInitialData();
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Connection error. Please try again.');
      if (error.message.includes('Authentication error')) {
        localStorage.removeItem('userToken');
        navigate('/login');
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      if (error.message === 'Authentication failed') {
        localStorage.removeItem('userToken');
        navigate('/login');
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        socketRef.current.connect();
      }
    });

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate]);

  // Separate useEffect for message handling
  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (newMessage) => {
      console.log('Received new message:', newMessage);
      
      setMessages(prev => {
        // If message is already in the list, don't add it
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }

        // If message is from or to the selected user, add it to messages
        if (selectedUser && 
            (newMessage.sender_id === selectedUser.id || 
             newMessage.recipient_id === selectedUser.id)) {
          return [...prev, newMessage];
        }

        return prev;
      });

      // Update unread count if message is not from current user and not from selected user
      if (newMessage.recipient_id === currentUser?.id && 
          newMessage.sender_id !== selectedUser?.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [newMessage.sender_id]: (prev[newMessage.sender_id] || 0) + 1
        }));
      }
    };

    const handleUserStatus = ({ userId, isOnline }) => {
      console.log('User status update:', userId, isOnline);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isOnline } : user
      ));
    };

    // Add event listeners
    socketRef.current.on('newMessage', handleNewMessage);
    socketRef.current.on('userStatus', handleUserStatus);

    // Cleanup function
    return () => {
      socketRef.current.off('newMessage', handleNewMessage);
      socketRef.current.off('userStatus', handleUserStatus);
    };
  }, [selectedUser, currentUser]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser || !currentUser) return;

    try {
      setIsSendingMessage(true);
      const userToken = localStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('No user token found');
      }

      const response = await fetch('https://chat-app-be-nm69.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          content: message,
          recipientId: selectedUser.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Clear the input field after successful send
      setMessage('');
    } catch (err) {
      setError(err.message);
      console.error('Error sending message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    navigate('/login');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setIsLoadingMessages(true);
    setError('');

    try {
      const userToken = localStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('No user token found');
      }

      const messagesResponse = await fetch('https://chat-app-be-nm69.onrender.com/api/messages', {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!messagesResponse.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messagesData = await messagesResponse.json();
      
      // Filter messages for selected user
      const filteredMessages = messagesData.filter(msg => 
        (msg.sender_id === user.id && msg.recipient_id === currentUser?.id) ||
        (msg.sender_id === currentUser?.id && msg.recipient_id === user.id)
      );
      
      setMessages(filteredMessages);
      // Reset unread count for selected user
      setUnreadCounts(prev => ({
        ...prev,
        [user.id]: 0
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error.message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const renderMessageStatus = (message) => {
    if (message.sender_id === currentUser?.id) {
      return (
        <span className="ml-1">
          <Check className="h-3 w-3 text-muted-foreground inline-block" />
        </span>
      );
    }
    return null;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-4">
              <CardTitle className="text-2xl">Workspace Chat</CardTitle>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            {currentUser && (
              <div className="flex items-center gap-2 relative group">
                <div className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-muted">
                  {/* <span className="text-sm">{currentUser.name}</span> */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium">
                    {getInitials(currentUser.name)}
                  </div>
                </div>
                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-popover rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="px-4 py-2 text-sm font-medium text-muted-foreground mb-1">
                    Signed in as {currentUser.name}
                  </div>
                  <div className="h-px bg-border my-1"></div>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="h-px bg-border my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-500"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Users List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="space-y-2">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            selectedUser?.id === user.id
                              ? 'bg-primary-foreground text-primary'
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            {getInitials(user.name)}
                          </div>
                          <p className="font-medium">{user.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {unreadCounts[user.id] > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                              {unreadCounts[user.id]}
                            </span>
                          )}
                          <span className={`h-2 w-2 rounded-full ${
                            user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                          }`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>
                {selectedUser ? `Chat with ${selectedUser.name}` : 'Select a user to chat'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[calc(100vh-320px)] overflow-y-auto space-y-4 mb-4 p-2">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : selectedUser ? (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'
                      } mb-3 w-full`}
                    >
                      <div className={`flex items-end gap-2 max-w-[85%] ${
                        msg.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'
                      }`}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium self-end flex-shrink-0">
                          {msg.sender_id !== currentUser?.id ? 
                            getInitials(selectedUser.name) :
                            getInitials(currentUser.name)
                          }
                        </div>
                        <div
                          className={`rounded-2xl px-3 py-2 break-words ${
                            msg.sender_id === currentUser?.id
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-muted rounded-bl-none'
                          }`}
                          style={{ minWidth: '80px', maxWidth: '100%', wordBreak: 'break-word' }}
                        >
                          <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <p className="text-xs opacity-70 flex-shrink-0">
                              {formatTime(msg.createdAt)}
                            </p>
                            {renderMessageStatus(msg)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a user to start chatting</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {selectedUser && (
                <form onSubmit={sendMessage} className="flex gap-3 p-4 bg-muted/50 rounded-lg">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isSendingMessage}
                  />
                  <Button type="submit" size="icon" disabled={isSendingMessage} className="h-10 w-10">
                    {isSendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
