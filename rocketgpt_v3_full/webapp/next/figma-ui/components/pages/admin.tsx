import React, { useState } from 'react';
import { useTheme } from '../theme-provider';
import { Card } from '../card';
import { Input } from '../input';
import { Button } from '../button';
import { Badge } from '../badge';
import { Plus, Edit, Trash2, Key, Users, Shield, FileText } from 'lucide-react';

export function AdminPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('users');

  const textPrimary = theme === 'dark' ? 'text-[#F9FAFB]' : 'text-[#111827]';
  const textSecondary = theme === 'dark' ? 'text-[#6B7280]' : 'text-[#9CA3AF]';

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', lastLogin: '2 mins ago' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Developer', status: 'active', lastLogin: '1 hour ago' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Viewer', status: 'active', lastLogin: '3 hours ago' },
    { id: 4, name: 'Sarah Williams', email: 'sarah@example.com', role: 'Developer', status: 'inactive', lastLogin: '2 days ago' },
  ];

  const roles = [
    { id: 1, name: 'Admin', users: 2, permissions: ['All'] },
    { id: 2, name: 'Developer', users: 5, permissions: ['Read', 'Write', 'Execute'] },
    { id: 3, name: 'Viewer', users: 8, permissions: ['Read'] },
  ];

  const apiKeys = [
    { id: 1, name: 'Production API', key: 'rkt_prod_***************', created: '2025-10-15', lastUsed: '5 mins ago', status: 'active' },
    { id: 2, name: 'Development API', key: 'rkt_dev_***************', created: '2025-11-01', lastUsed: '2 hours ago', status: 'active' },
    { id: 3, name: 'Test API', key: 'rkt_test_***************', created: '2025-11-10', lastUsed: 'Never', status: 'inactive' },
  ];

  const auditLogs = [
    { id: 1, user: 'John Doe', action: 'Created user', target: 'jane@example.com', timestamp: '2025-11-19 14:30:00' },
    { id: 2, user: 'Jane Smith', action: 'Updated role', target: 'Mike Johnson', timestamp: '2025-11-19 13:15:00' },
    { id: 3, user: 'Admin', action: 'Generated API key', target: 'Production API', timestamp: '2025-11-19 12:00:00' },
    { id: 4, user: 'John Doe', action: 'Deleted user', target: 'old@example.com', timestamp: '2025-11-19 10:45:00' },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-inherit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 transition-all border-b-2 ${
                activeTab === tab.id
                  ? theme === 'dark'
                    ? 'border-[#3B82F6] text-[#3B82F6]'
                    : 'border-[#2563EB] text-[#2563EB]'
                  : `border-transparent ${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <Input placeholder="Search users..." />
            </div>
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Add User
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Name</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Email</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Role</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Status</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Last Login</th>
                    <th className={`px-6 py-3 text-right ${textPrimary}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {users.map((user) => (
                    <tr key={user.id} className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                      <td className={`px-6 py-4 ${textPrimary}`}>{user.name}</td>
                      <td className={`px-6 py-4 ${textSecondary}`}>{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.role === 'Admin' ? 'error' : 'default'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className={`px-6 py-4 ${textSecondary}`}>{user.lastLogin}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-[#EF4444]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <div className="mb-6">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Create Role
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className={`mb-1 ${textPrimary}`}>{role.name}</h3>
                    <p className={`text-sm ${textSecondary}`}>{role.users} users</p>
                  </div>
                  <Shield className={`w-5 h-5 ${textSecondary}`} />
                </div>
                <div className="mb-4">
                  <p className={`text-sm ${textSecondary} mb-2`}>Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((perm) => (
                      <Badge key={perm} variant="default">{perm}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div>
          <div className="mb-6">
            <Button>
              <Plus className="w-5 h-5 mr-2" />
              Generate API Key
            </Button>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                  <tr>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Name</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>API Key</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Created</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Last Used</th>
                    <th className={`px-6 py-3 text-left ${textPrimary}`}>Status</th>
                    <th className={`px-6 py-3 text-right ${textPrimary}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {apiKeys.map((apiKey) => (
                    <tr key={apiKey.id} className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                      <td className={`px-6 py-4 ${textPrimary}`}>{apiKey.name}</td>
                      <td className={`px-6 py-4 ${textSecondary} font-mono text-sm`}>{apiKey.key}</td>
                      <td className={`px-6 py-4 ${textSecondary}`}>{apiKey.created}</td>
                      <td className={`px-6 py-4 ${textSecondary}`}>{apiKey.lastUsed}</td>
                      <td className="px-6 py-4">
                        <Badge variant={apiKey.status === 'active' ? 'success' : 'default'}>
                          {apiKey.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-[#EF4444]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${theme === 'dark' ? 'bg-[#0D0F14]' : 'bg-[#F5F5F5]'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left ${textPrimary}`}>Timestamp</th>
                  <th className={`px-6 py-3 text-left ${textPrimary}`}>User</th>
                  <th className={`px-6 py-3 text-left ${textPrimary}`}>Action</th>
                  <th className={`px-6 py-3 text-left ${textPrimary}`}>Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {auditLogs.map((log) => (
                  <tr key={log.id} className={theme === 'dark' ? 'hover:bg-[#1A1D24]' : 'hover:bg-[#F9FAFB]'}>
                    <td className={`px-6 py-4 ${textSecondary} font-mono text-sm`}>{log.timestamp}</td>
                    <td className={`px-6 py-4 ${textPrimary}`}>{log.user}</td>
                    <td className={`px-6 py-4 ${textPrimary}`}>{log.action}</td>
                    <td className={`px-6 py-4 ${textSecondary}`}>{log.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
