import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, LogOut, Plus } from 'lucide-react';

export default function AdminDashboard() {
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', name: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAuthorizedUsers();
  }, []);

  const fetchAuthorizedUsers = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const response = await fetch('https://chat-app-be-nm69.onrender.com/api/admin/authorized-users', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch authorized users');
      }

      const data = await response.json();
      setAuthorizedUsers(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching authorized users:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) {
        throw new Error('No admin token found');
      }

      const response = await fetch('https://chat-app-be-nm69.onrender.com/api/admin/authorized-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        throw new Error('Failed to add authorized user');
      }

      setNewUser({ email: '', name: '' });
      fetchAuthorizedUsers();
    } catch (err) {
      setError(err.message);
      console.error('Error adding authorized user:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage authorized users for the workspace
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Authorized User
            </CardTitle>
            <CardDescription>
              Add a new email address that will be allowed to register
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="User Name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-500">
                  {error}
                </div>
              )}
              <Button type="submit">
                Add User
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authorized Users</CardTitle>
            <CardDescription>
              List of email addresses that are allowed to register
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {authorizedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
              {authorizedUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No authorized users found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 