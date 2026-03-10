import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Plus,
  Settings,
  LogOut,
  MoreVertical,
  LayoutDashboard,
  Sun,
  Calendar,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../context/AuthContext';
import { useProjects } from '../../context/ProjectContext';
import { cn } from '../../utils/cn';
import { Button } from '../common/Button';
import { LabelManager } from '../common/LabelManager';

const PROJECT_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

function SortableProjectItem({ project, isActive, onClose, onContextMenu }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 shadow-lg rounded-lg bg-white dark:bg-gray-800"
      )}
    >
      <div
        className={cn(
          'group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1 -ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <NavLink
            to={`/projects/${project.id}`}
            onClick={onClose}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <span
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate">{project.name}</span>
          </NavLink>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400">
            {project.taskCount || 0}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onContextMenu({
                id: project.id,
                name: project.name,
                color: project.color,
                x: e.clientX,
                y: e.clientY,
              });
            }}
            className="rounded p-1 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 dark:hover:bg-gray-700"
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { projects, createProject, updateProject, deleteProject, reorderProjects } = useProjects();
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [editingProject, setEditingProject] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const [showLabelManager, setShowLabelManager] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
    setNewProjectColor(PROJECT_COLORS[0]);
    setShowNewProject(false);
  };

  const handleUpdateProject = async () => {
    if (!editingProject?.name?.trim()) return;
    await updateProject(editingProject.id, {
      name: editingProject.name.trim(),
      color: editingProject.color,
    });
    setEditingProject(null);
  };

  const handleDeleteProject = async () => {
    if (!contextMenu) return;
    if (window.confirm('Are you sure you want to delete this project?')) {
      await deleteProject(contextMenu.id);
      navigate('/dashboard');
    }
    setContextMenu(null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(projects, oldIndex, newIndex);
        await reorderProjects(reordered);
      }
    }
  };

  return (
    <>
      <aside
        className={cn(
          'h-full w-64 bg-white dark:bg-gray-900 flex flex-col',
          'fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 lg:transform-none lg:static lg:z-30',
          !isOpen && '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-gray-200 px-4 dark:border-gray-800">
          <h1 className="text-xl font-bold text-primary-600">Todo App</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <NavLink
            to="/today"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )
            }
          >
            <Sun className="h-5 w-5 text-amber-500" />
            Today
          </NavLink>

          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )
            }
          >
            <LayoutDashboard className="h-5 w-5 text-indigo-500" />
            All Projects
          </NavLink>

          <NavLink
            to="/calendar"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              )
            }
          >
            <Calendar className="h-5 w-5 text-emerald-500" />
            Calendar
          </NavLink>

          {/* Labels Manager Trigger */}
          <button
            onClick={() => setShowLabelManager(true)}
            className="w-full mt-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center">#</span>
              Tags / Labels
            </div>
            <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          </button>

          {/* Projects List */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Projects
              </span>
              <button
                onClick={() => setShowNewProject(true)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={projects.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {projects.map((project) => (
                    <SortableProjectItem
                      key={project.id}
                      project={project}
                      onClose={onClose}
                      onContextMenu={setContextMenu}
                      isActive={window.location.pathname === `/projects/${project.id}`}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <div className="flex items-center gap-3 rounded-lg p-2">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium">{user?.name || 'Unknown'}</p>
              <p className="truncate text-xs text-gray-500">{user?.email || 'No email'}</p>
            </div>
          </div>
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => navigate('/settings')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 rounded-lg p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              New Project
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Project"
                  className="input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${newProjectColor === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => {
                setShowNewProject(false);
                setNewProjectName('');
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                setEditingProject({ ...contextMenu });
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteProject}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Edit Project
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditingProject({ ...editingProject, color })}
                      className={`h-8 w-8 rounded-full transition-transform ${editingProject.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateProject} disabled={!editingProject.name?.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Label Manager Modal */}
      <LabelManager isOpen={showLabelManager} onClose={() => setShowLabelManager(false)} />
    </>
  );
}
