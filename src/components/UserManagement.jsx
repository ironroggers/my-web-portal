import React, { useState, useEffect, useMemo } from "react";
import "./UserManagement.css";
import {
  Container,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  FormHelperText,
  InputAdornment,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { AUTH_URL } from "../API/api-keys.jsx";

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

const UserManagement = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "SURVEYOR",
    reportingTo: "",
    designation: "",
    project: "",
  });
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
        setUsers(responseData.data);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const requestBody = {
        ...formData,
        ...(formData.role !== "ADMIN" && formData.reportingTo
          ? { reportingTo: formData.reportingTo }
          : {}),
      };
      if (!formData.project) {
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
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "SURVEYOR",
        reportingTo: "",
        designation: "",
        project: "",
      });
      setEditMode(false);
      setEditUserId(null);

      fetchAllUsers();
      fetchPotentialManagers();
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
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
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const cancelEdit = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      role: "SURVEYOR",
      reportingTo: "",
      designation: "",
      project: "",
    });
    setEditMode(false);
    setEditUserId(null);
  };

  // Function to get reporting manager name
  const getManagerName = (managerId) => {
    if (!managerId) return "-";
    const manager = users.find((user) => user._id === managerId);
    return manager ? manager.username : "Unknown";
  };

  const isAdmin = formData.role === "ADMIN";

  // Filtered users based on search and filters
  const filteredUsers = useMemo(() => {
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

    if (roleFilter !== "ALL") {
      data = data.filter((u) => u.role === roleFilter);
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
  }, [users, searchQuery, roleFilter, managerFilter, projectFilter]);

  // Handle table pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth="xl" className="user-management-container">
      <Box sx={{ mb: 5, textAlign: "center" }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            background: "linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <PeopleAltIcon sx={{ fontSize: 40, color: "#2563eb" }} />
          User Access Management
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError("")}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setSuccess("")}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            {success}
          </Alert>
        )}
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4} sx={{ width: "100%" }}>
          <Card elevation={0}>
            <CardHeader
              title={editMode ? "Edit User" : "Create New User"}
              titleTypographyProps={{ variant: "h6" }}
              avatar={
                <Box
                  sx={{
                    bgcolor: "primary.light",
                    borderRadius: "12px",
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PersonAddIcon sx={{ color: "white" }} />
                </Box>
              }
            />
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2} sx={{ width: "100%" }}>
                  <Grid item xs={12} sx={{ width: "20%" }}>
                    <TextField
                      fullWidth
                      label="Name"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ width: "20%" }}>
                    <TextField
                      fullWidth
                      label="Email"
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      variant="outlined"
                      size="small"
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ width: "20%" }}>
                    <TextField
                      fullWidth
                      label="Password"
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editMode}
                      variant="outlined"
                      size="small"
                      helperText={
                        editMode
                          ? "Leave blank to keep current password"
                          : "Minimum 6 characters"
                      }
                    />
                  </Grid>

                  <Grid item xs={6} sx={{ width: "20%" }}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="role-label">Role</InputLabel>
                      <Select
                        labelId="role-label"
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        label="Role"
                      >
                        <MenuItem value="SURVEYOR">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label="Surveyor"
                              size="small"
                              color="success"
                              sx={{ height: 24 }}
                            />
                          </Box>
                        </MenuItem>
                        <MenuItem value="SUPERVISOR">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label="Supervisor"
                              size="small"
                              color="warning"
                              sx={{ height: 24 }}
                            />
                          </Box>
                        </MenuItem>
                        <MenuItem value="EXECUTION ENGINEER">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label="Execution Engineer"
                              size="small"
                              color="info"
                              sx={{ height: 24 }}
                            />
                          </Box>
                        </MenuItem>
                        <MenuItem value="VIEWER">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label="Viewer"
                              size="small"
                              color="default"
                              sx={{ height: 24 }}
                            />
                          </Box>
                        </MenuItem>
                        <MenuItem value="ADMIN">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Chip
                              label="Admin"
                              size="small"
                              color="error"
                              sx={{ height: 24 }}
                            />
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6} sx={{ width: "20%" }}>
                    <FormControl
                      fullWidth
                      variant="outlined"
                      size="small"
                      disabled={isAdmin}
                    >
                      <InputLabel id="reporting-to-label">
                        Reporting To
                      </InputLabel>
                      <Select
                        labelId="reporting-to-label"
                        id="reportingTo"
                        name="reportingTo"
                        value={formData.reportingTo}
                        onChange={handleChange}
                        required={!isAdmin}
                        label="Reporting To"
                      >
                        <MenuItem value="">
                          <em>Select Manager</em>
                        </MenuItem>
                        {potentialManagers &&
                          potentialManagers.map((manager) => (
                            <MenuItem key={manager._id} value={manager._id}>
                              {manager.username}
                            </MenuItem>
                          ))}
                      </Select>
                      {isAdmin && (
                        <FormHelperText>
                          Not required for Admin role
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sx={{ width: "20%" }}>
                    <TextField
                      fullWidth
                      label="Designation"
                      id="designation"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      variant="outlined"
                      size="small"
                      placeholder="e.g. Senior Surveyor"
                    />
                  </Grid>

                  <Grid item xs={12} sx={{ width: "20%" }}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel id="project-label">Project</InputLabel>
                      <Select
                        labelId="project-label"
                        id="project"
                        name="project"
                        value={formData.project}
                        onChange={handleChange}
                        label="Project"
                      >
                        <MenuItem value="">
                          <em>Select Project</em>
                        </MenuItem>
                        {PROJECT_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sx={{ width: "20%" }}>
                    <Box
                      sx={{ display: "flex", gap: 2, flexDirection: "column" }}
                    >
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={loading}
                        startIcon={
                          loading ? (
                            <CircularProgress size={20} />
                          ) : (
                            <PersonAddIcon />
                          )
                        }
                      >
                        {loading
                          ? editMode
                            ? "Updating..."
                            : "Creating..."
                          : editMode
                          ? "Update User"
                          : "Create User"}
                      </Button>
                      {editMode && (
                        <Button
                          variant="outlined"
                          color="secondary"
                          fullWidth
                          onClick={cancelEdit}
                          startIcon={<DeleteIcon />}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4} sx={{ width: "100%" }}>
          <Card elevation={0}>
            <CardHeader
              title="Existing Users"
              titleTypographyProps={{ variant: "h6" }}
              avatar={
                <Box
                  sx={{
                    bgcolor: "primary.light",
                    borderRadius: "12px",
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PeopleAltIcon sx={{ color: "white" }} />
                </Box>
              }
            />
            <CardContent>
              {loadingUsers ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    p: 4,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Search by name, email, or designation"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          sx={{ width: 320 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small" sx={{ width: 220 }}>
                          <InputLabel id="filter-role-label">Role</InputLabel>
                          <Select
                            labelId="filter-role-label"
                            value={roleFilter}
                            label="Role"
                            onChange={(e) => setRoleFilter(e.target.value)}
                          >
                            <MenuItem value="ALL">All</MenuItem>
                            <MenuItem value="ADMIN">Admin</MenuItem>
                            <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                            <MenuItem value="SURVEYOR">Surveyor</MenuItem>
                            <MenuItem value="EXECUTION ENGINEER">Execution Engineer</MenuItem>
                            <MenuItem value="VIEWER">Viewer</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small" sx={{ width: 220 }}>
                          <InputLabel id="filter-manager-label">Manager</InputLabel>
                          <Select
                            labelId="filter-manager-label"
                            value={managerFilter}
                            label="Manager"
                            onChange={(e) => setManagerFilter(e.target.value)}
                          >
                            <MenuItem value="ALL">All</MenuItem>
                            <MenuItem value="UNASSIGNED">Unassigned</MenuItem>
                            {potentialManagers &&
                              potentialManagers.map((manager) => (
                                <MenuItem key={manager._id} value={manager._id}>
                                  {manager.username}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small" sx={{ width: 220 }}>
                          <InputLabel id="filter-project-label">Project</InputLabel>
                          <Select
                            labelId="filter-project-label"
                            value={projectFilter}
                            label="Project"
                            onChange={(e) => setProjectFilter(e.target.value)}
                          >
                            <MenuItem value="ALL">All</MenuItem>
                            {PROJECT_OPTIONS.map((opt) => (
                              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={12}>
                        <Box sx={{ display: "flex", gap: 1, justifyContent: { xs: "stretch", md: "flex-end" } }}>
                          <Button
                            variant="text"
                            onClick={() => {
                              setSearchQuery("");
                              setRoleFilter("ALL");
                              setManagerFilter("ALL");
                              setProjectFilter("ALL");
                            }}
                          >
                            Clear filters
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {filteredUsers.length > 0 ? (
                    <>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Username
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Email
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Role
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Designation
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Project
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Reporting To
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Actions
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {filteredUsers
                              .slice(
                                page * rowsPerPage,
                                page * rowsPerPage + rowsPerPage
                              )
                              .map((user) => (
                                <TableRow key={user._id} hover>
                                  <TableCell>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      {user.username}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{user.email}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={user.role}
                                      size="small"
                                      color={
                                        user.role === "ADMIN"
                                          ? "error"
                                          : user.role === "SUPERVISOR"
                                          ? "warning"
                                          : user.role === "SURVEYOR"
                                          ? "success"
                                          : user.role === "EXECUTION ENGINEER"
                                          ? "info"
                                          : "default"
                                      }
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell>{user.designation || "-"}</TableCell>
                                  <TableCell>{user.project || "-"}</TableCell>
                                  <TableCell>
                                    {user.reportingTo
                                      ? user.reportingTo.username
                                      : "-"}
                                  </TableCell>
                                  <TableCell align="right">
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        justifyContent: "flex-end",
                                      }}
                                    >
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => handleEdit(user)}
                                        sx={{
                                          "&:hover": {
                                            bgcolor: "primary.light",
                                            "& svg": { color: "white" },
                                          },
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteClick(user)}
                                        sx={{
                                          "&:hover": {
                                            bgcolor: "error.light",
                                            "& svg": { color: "white" },
                                          },
                                        }}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        component="div"
                        count={filteredUsers.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25]}
                      />
                    </>
                  ) : (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: "center",
                        bgcolor: "#f8fafc",
                        borderRadius: 2,
                        border: "1px dashed #e2e8f0",
                      }}
                    >
                      <Typography variant="body1" color="text.secondary">
                        No users found.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: 2,
            minWidth: 360,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Confirm Delete
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <DialogContentText>
            Are you sure you want to delete user "{userToDelete?.username}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleDelete(userToDelete?._id)}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement;
