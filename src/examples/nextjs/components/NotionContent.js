import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

export function NotionContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: pages, error, mutate } = useSWR('/api/notion', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create page');
      
      mutate(); // Refresh the data
      e.target.reset();
    } catch (error) {
      console.error('Error creating page:', error);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/notion?id=${editData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update page');
      
      mutate();
      setIsEditing(false);
      setEditData(null);
    } catch (error) {
      console.error('Error updating page:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const response = await fetch(`/api/notion?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete page');
      
      mutate();
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  if (error) return <div>Failed to load content</div>;
  if (!pages) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Notion Content</h1>

      {/* Create Form */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Create New Page</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            name="title"
            placeholder="Title"
            required
            className="w-full p-2 border rounded"
          />
          <textarea
            name="description"
            placeholder="Description"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            name="author"
            placeholder="Author"
            className="w-full p-2 border rounded"
          />
          <input
            type="url"
            name="imageUrl"
            placeholder="Image URL"
            className="w-full p-2 border rounded"
          />
          <input
            type="url"
            name="link"
            placeholder="Link"
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Page
          </button>
        </form>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pages.map(page => (
          <div key={page.id} className="border rounded-lg p-4 shadow-sm">
            {page.imageUrl && (
              <img
                src={page.imageUrl}
                alt={page.title}
                className="w-full h-48 object-cover rounded-t-lg mb-4"
              />
            )}
            <h2 className="text-xl font-semibold mb-2">{page.title}</h2>
            <p className="text-gray-600 mb-2">{page.description}</p>
            <p className="text-sm text-gray-500 mb-4">By {page.author}</p>
            
            <div className="flex justify-between items-center">
              {page.link && (
                <a
                  href={page.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Visit Link
                </a>
              )}
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditData(page);
                  }}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(page.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Page</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <input
                type="text"
                name="title"
                defaultValue={editData.title}
                className="w-full p-2 border rounded"
              />
              <textarea
                name="description"
                defaultValue={editData.description}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                name="author"
                defaultValue={editData.author}
                className="w-full p-2 border rounded"
              />
              <input
                type="url"
                name="imageUrl"
                defaultValue={editData.imageUrl}
                className="w-full p-2 border rounded"
              />
              <input
                type="url"
                name="link"
                defaultValue={editData.link}
                className="w-full p-2 border rounded"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(null);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 