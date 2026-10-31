import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  TextField,
  Button,
  MenuItem,
  Alert,
  Avatar,
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Skeleton,
  Snackbar,
  Tab,
  Tabs,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import { AUTH_URL } from "../API/api-keys.jsx";
import PageHeader from "./common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS, ROLE_OPTIONS, ZONAL_MANAGED_ROLES, currentRole } from "../config/roles";

const PROJECT_OPTIONS = [
  "BharatNet Kerala",
  "NFS",
  "BUIDCO",
  "JUDCO",
  "MPUDC",
  "KMC",
  "DEL Office",
  "HDD",
  "GAIL",
  "SIDCL",
  "Others",
];


const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
  role: "SURVEYOR",
  reportingTo: "",
  designation: "",
  project: "",
};

const TABLE_COLUMNS = 6;

// =============================================================================
// PRESENTATIONAL COMPONENTS
// =============================================================================

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

const UserAvatar = ({ name }) => (
  <Avatar
    sx={(theme) => ({
      width: 32,
      height: 32,
      fontSize: "0.75rem",
      color: "primary.dark",
      bgcolor: alpha(theme.palette.primary.main, 0.1),
    })}
  >
    {getInitials(name)}
  </Avatar>
);

const RoleChip = ({ role }) => {
  const isAdmin = role === "ADMIN";
  return (
    <Chip
      size="small"
      label={ROLE_LABELS[role] ?? role ?? "—"}
      variant={isAdmin ? "filled" : "outlined"}
      sx={(theme) =>
        isAdmin
          ? { bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.dark", fontWeight: 600 }
          : { bgcolor: "background.paper", borderColor: "divider", color: "text.primary" }
      }
    />
  );
};

const UserIdentity = ({ user }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
    <UserAvatar name={user.username} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
        {user.username}
      </Typography>
      <Typography variant="caption" noWrap component="div" sx={{ color: "text.secondary" }}>
        {user.email}
      </Typography>
    </Box>
  </Box>
);

const RowActions = ({ user, onEdit, onDelete }) => (
  <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
    <Tooltip title="Edit user">
      <IconButton size="small" onClick={() => onEdit(user)} aria-label={`Edit ${user.username}`}>
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Delete user">
      <IconButton
        size="small"
        onClick={() => onDelete(user)}
        aria-label={`Delete ${user.username}`}
        sx={{ "&:hover": { color: "error.main" } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Box>
);

const UserFormDialog = ({
  open,
  editMode,
  formData,
  onChange,
  onSubmit,
  onClose,
  loading,
  error,
  potentialManagers,
  roleOptions,
}) => {
  const isAdmin = formData.role === "ADMIN";

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { component: "form", onSubmit } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", gap: 2, pr: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          {editMode ? "Edit user" : "Add user"}
          <Typography variant="body2" component="div" sx={{ color: "text.secondary", mt: 0.25 }}>
            {editMode ? formData.email : "Create a portal or field account"}
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={loading} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            pt: 0.5,
          }}
        >
          <TextField
            fullWidth
            label="Name"
            id="username"
            name="username"
            value={formData.username}
            onChange={onChange}
            required
            size="small"
            autoFocus={!editMode}
          />
          <TextField
            fullWidth
            label="Email"
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            required
            size="small"
          />
          <TextField
            select
            fullWidth
            label="Role"
            id="role"
            name="role"
            value={formData.role}
            onChange={onChange}
            required
            size="small"
          >
            {roleOptions.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Reporting to"
            id="reportingTo"
            name="reportingTo"
            value={formData.reportingTo}
            onChange={onChange}
            required={!isAdmin}
            disabled={isAdmin}
            size="small"
            helperText={isAdmin ? "Not required for Admin role" : undefined}
          >
            <MenuItem value="">
              <em>Select manager</em>
            </MenuItem>
            {potentialManagers.map((manager) => (
              <MenuItem key={manager._id} value={manager._id}>
                {manager.username}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Designation"
            id="designation"
            name="designation"
            value={formData.designation}
            onChange={onChange}
            size="small"
            placeholder="e.g. Senior Surveyor"
          />
          <TextField
            select
            fullWidth
            label="Project"
            id="project"
            name="project"
            value={formData.project}
            onChange={onChange}
            size="small"
          >
            <MenuItem value="">
              <em>No project</em>
            </MenuItem>
            {PROJECT_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Password"
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={onChange}
            required={!editMode}
            size="small"
            autoComplete="new-password"
            helperText={editMode ? "Leave blank to keep current password" : "Minimum 6 characters"}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {loading
            ? editMode
              ? "Updating…"
              : "Creating…"
            : editMode
              ? "Update user"
              : "Create user"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// =============================================================================
// PAGE
// =============================================================================

// Admin manages every account; a Zonal Manager the Cluster Heads, GIS Heads and Field
// Executives; everyone else only looks
const managedRolesFor = (role) => (role === "ADMIN" ? ROLE_OPTIONS.map((r) => r.value) : role === "ZONAL MANAGER" ? ZONAL_MANAGED_ROLES : []);

const UserManagement = () => {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("md"));
  const { user: me } = useAuth();
  const managedRoles = managedRolesFor(me?.role);
  const roleOptions = ROLE_OPTIONS.filter((r) => managedRoles.includes(r.value));
  const canManage = (user) => managedRoles.includes(user.role);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [potentialManagers, setPotentialManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [managerFilter, setManagerFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");

  useEffect(() => {
    fetchPotentialManagers();
    fetchAllUsers();
  }, []);

  // Clear reportingTo when role changes to ADMIN
  useEffect(() => {
    if (formData.role === "ADMIN") {
      setFormData((prev) => ({ ...prev, reportingTo: "" }));
    }
  }, [formData.role]);

  // Reset pagination whenever filters/search change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, roleFilter, managerFilter, projectFilter]);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(`${AUTH_URL}/api/auth/users`);

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const responseData = await response.json();
      if (responseData.success && Array.isArray(responseData.data)) {
        setUsers(responseData.data.map((u) => ({ ...u, role: currentRole(u.role) })));
      } else {
        throw new Error("Invalid data format received from server");
      }
    } catch (err) {
      setError("Failed to load users");
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPotentialManagers = async () => {
    try {
      const baseUrl = AUTH_URL + "/api";
      const response = await fetch(`${baseUrl}/auth/potential-managers`);

      if (!response.ok) {
        throw new Error("Failed to fetch potential managers");
      }

      const responseData = await response.json();
      // Check if the response has the expected structure and set only the data array
      if (responseData.success && Array.isArray(responseData.data)) {
        setPotentialManagers(responseData.data);
      } else {
        throw new Error("Invalid data format received from server");
      }
    } catch (err) {
      setError("Failed to load potential managers");
      console.error("Error fetching managers:", err);
    }
  };

  const handleRefresh = () => {
    setError("");
    fetchAllUsers();
    fetchPotentialManagers();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormError("");
    setFormData(EMPTY_FORM);
    setEditMode(false);
    setEditUserId(null);
  };

  const openCreateForm = () => {
    setFormData({ ...EMPTY_FORM, role: managedRoles.includes(EMPTY_FORM.role) ? EMPTY_FORM.role : managedRoles[0] });
    setEditMode(false);
    setEditUserId(null);
    setFormError("");
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      const requestBody = {
        ...formData,
        ...(formData.role !== "ADMIN" && formData.reportingTo
          ? { reportingTo: formData.reportingTo }
          : {}),
      };
      // An edit sends the blank project so it clears; a new account just has none
      if (!formData.project && !editMode) {
        delete requestBody.project;
      }

      const url = editMode
        ? `${AUTH_URL}/api/auth/users/${editUserId}`
        : `${AUTH_URL}/api/auth/register`;

      const method = editMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Operation failed");
      }

      setSuccess(
        editMode ? "User updated successfully!" : "User created successfully!"
      );
      closeForm();

      fetchAllUsers();
      fetchPotentialManagers();
    } catch (err) {
      setFormError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    setDeleting(true);
    try {
      const response = await fetch(`${AUTH_URL}/api/auth/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete user");
      }

      setSuccess("User deleted successfully!");
      fetchAllUsers();
    } catch (err) {
      setError(err.message || "An error occurred while deleting the user");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      password: "", // Clear password field for security
      role: user.role,
      reportingTo: user.reportingTo?._id || "",
      designation: user.designation || "",
      project: user.project || "",
    });
    setEditMode(true);
    setEditUserId(user._id);
    setFormError("");
    setFormOpen(true);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  // Users matching search, manager and project; role is applied separately so
  // the role tabs can show how many of these users each role has.
  const baseFilteredUsers = useMemo(() => {
    let data = users;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      data = data.filter((u) => {
        const name = (u.username || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const designation = (u.designation || "").toLowerCase();
        return (
          name.includes(query) || email.includes(query) || designation.includes(query)
        );
      });
    }

    if (managerFilter !== "ALL") {
      if (managerFilter === "UNASSIGNED") {
        data = data.filter((u) => !u.reportingTo);
      } else {
        data = data.filter((u) => u.reportingTo?._id === managerFilter);
      }
    }

    if (projectFilter !== "ALL") {
      data = data.filter((u) => (u.project || "") === projectFilter);
    }

    return data;
  }, [users, searchQuery, managerFilter, projectFilter]);

  const filteredUsers = useMemo(
    () => (roleFilter === "ALL" ? baseFilteredUsers : baseFilteredUsers.filter((u) => u.role === roleFilter)),
    [baseFilteredUsers, roleFilter]
  );

  const roleCounts = useMemo(() => {
    const counts = {};
    baseFilteredUsers.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [baseFilteredUsers]);

  const hasActiveFilters =
    Boolean(searchQuery) || roleFilter !== "ALL" || managerFilter !== "ALL" || projectFilter !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setManagerFilter("ALL");
    setProjectFilter("ALL");
  };

  // Handle table pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const pageUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const showSkeleton = loadingUsers && users.length === 0;

  const emptyState = (
    <Box sx={{ py: 6, px: 2, textAlign: "center" }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        No users found
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {hasActiveFilters ? "Try adjusting or clearing the filters." : "Add a user to get started."}
      </Typography>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Portal and field accounts, their roles and reporting lines"
        actions={
          <>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              disabled={loadingUsers}
              startIcon={loadingUsers ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
            >
              Refresh
            </Button>
            {managedRoles.length > 0 && (
              <Button variant="contained" size="small" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={openCreateForm}>
                Add user
              </Button>
            )}
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card>
        {/* Role tabs double as the role filter */}
        <Tabs
          value={roleFilter}
          onChange={(event, value) => setRoleFilter(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 1, borderBottom: 1, borderColor: "divider" }}
        >
          {[{ value: "ALL", label: "All users" }, ...ROLE_OPTIONS].map((role) => {
            const count = role.value === "ALL" ? baseFilteredUsers.length : roleCounts[role.value] || 0;
            return (
              <Tab
                key={role.value}
                value={role.value}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {role.label}
                    <Box
                      component="span"
                      sx={{
                        px: 0.75,
                        borderRadius: 1,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        bgcolor: roleFilter === role.value ? alpha(theme.palette.primary.main, 0.1) : "action.hover",
                        color: roleFilter === role.value ? "primary.main" : "text.secondary",
                      }}
                    >
                      {count}
                    </Box>
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        <Box
          sx={{
            p: 2,
            display: "grid",
            gap: 1.5,
            alignItems: "center",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "minmax(0, 2fr) repeat(2, minmax(0, 1fr)) auto",
            },
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <TextField
            size="small"
            placeholder="Search by name, email, or designation"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              htmlInput: { "aria-label": "Search users" },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Manager"
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
          >
            <MenuItem value="ALL">All managers</MenuItem>
            <MenuItem value="UNASSIGNED">Unassigned</MenuItem>
            {potentialManagers.map((manager) => (
              <MenuItem key={manager._id} value={manager._id}>
                {manager.username}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Project"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <MenuItem value="ALL">All projects</MenuItem>
            {PROJECT_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
          <Button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            startIcon={<FilterAltOffOutlinedIcon />}
            sx={{ justifySelf: { xs: "start", md: "end" } }}
          >
            Clear
          </Button>
        </Box>

        {isCompact ? (
          <Box>
            {showSkeleton
              ? Array.from({ length: 4 }, (_, index) => (
                  <Box key={index} sx={{ px: 2, py: 1.75 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                ))
              : pageUsers.length === 0
                ? emptyState
                : pageUsers.map((user) => (
                    <Box key={user._id} sx={{ px: 2, py: 1.5, "& + &": { borderTop: 1, borderColor: "divider" } }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <UserIdentity user={user} />
                        </Box>
                        {canManage(user) && <RowActions user={user} onEdit={handleEdit} onDelete={handleDeleteClick} />}
                      </Box>
                      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 1, pl: 5.5 }}>
                        <RoleChip role={user.role} />
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {[user.designation, user.project, user.reportingTo && `Reports to ${user.reportingTo.username}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Reporting to</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {showSkeleton ? (
                  Array.from({ length: 5 }, (_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: TABLE_COLUMNS }, (__, cell) => (
                        <TableCell key={cell}>
                          <Skeleton variant="text" width={cell === 0 ? "70%" : "50%"} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : pageUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_COLUMNS} sx={{ p: 0, borderBottom: 0 }}>
                      {emptyState}
                    </TableCell>
                  </TableRow>
                ) : (
                  pageUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <UserIdentity user={user} />
                      </TableCell>
                      <TableCell>
                        <RoleChip role={user.role} />
                      </TableCell>
                      <TableCell sx={{ color: user.designation ? "text.primary" : "text.disabled" }}>
                        {user.designation || "—"}
                      </TableCell>
                      <TableCell sx={{ color: user.project ? "text.primary" : "text.disabled" }}>
                        {user.project || "—"}
                      </TableCell>
                      <TableCell sx={{ color: user.reportingTo ? "text.primary" : "text.disabled" }}>
                        {user.reportingTo ? user.reportingTo.username : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {canManage(user) && <RowActions user={user} onEdit={handleEdit} onDelete={handleDeleteClick} />}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
          sx={{ borderTop: 1, borderColor: "divider" }}
        />
      </Card>

      <UserFormDialog
        open={formOpen}
        editMode={editMode}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onClose={closeForm}
        loading={loading}
        error={formError}
        potentialManagers={potentialManagers}
        roleOptions={roleOptions}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={deleting ? undefined : () => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <DialogContentText variant="body2">
            <strong>{userToDelete?.username}</strong>
            {userToDelete?.email ? ` (${userToDelete.email})` : ""} will be permanently removed. This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(userToDelete?._id)}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() => setSuccess("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSuccess("")} sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
