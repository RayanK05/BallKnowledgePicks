import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
    const isAuthenticated = localStorage.getItem('token');

    if (!isAuthenticated) {
        return <Navigate to="/Login" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;