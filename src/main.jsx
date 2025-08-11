import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import Dashboard from './pages/dashboard.jsx'
import Analytics from './pages/Analytics.jsx'
import News from './pages/News.jsx'
import Intelligence from './pages/Intelligence.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'news', element: <News /> },
      { path: 'intelligence', element: <Intelligence /> },
      { path: '*', element: <div className="p-6">Not Found</div> }
    ]
  }
], {
  basename: '/',
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
