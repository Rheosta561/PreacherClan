import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Authentication/Login';
import Signup from './Authentication/Signup';
import Navbar from './Components/Navbar';
import Dashboard from './Dashboard';
import Layout from './Layout';
import JoinClan from './Screens/JoinClan';
import GymBuddyFinder from './Screens/GymBuddyFinder';
import { Toaster } from "sonner";
import Notifications from './Screens/Notifications';
import Profile from './Screens/Profile';
import SearchScreen from './Screens/SearchScreen';
import Clan from './Screens/Clan';
import { socket } from './socket';
import { NotificationProvider } from './context/NotificationContext';
import NotificationListener from './Components/NotificationListener' ;
function App() {
  
  return (
  <NotificationProvider>
    <NotificationListener />
    
    
    <BrowserRouter>
    <Toaster
  position="top-center"
  theme="dark"
  toastOptions={{
    classNames: {
      toast: "bg-zinc-900 text-white border border-red-800 shadow-2xl",
      title: "font-bold text-red-500",
      description: "text-sm text-zinc-300 ",
    },
    duration: 4000,
  }}
/>
   
    <Layout>
      <Navbar/>
    <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/signup' element={<Signup/>} />
        
        <Route path='/dashboard' element={<Dashboard/>} />
        <Route path ='/join/gym' element={<JoinClan/>} />
        <Route path = '/gym/buddy/finder' element={<GymBuddyFinder/>} />
        <Route path = '/notifications' element = {<Notifications/>} />

        <Route path = '/profile' element = {<Profile/>} />
        <Route path = '/search' element = {<SearchScreen/>} />
        <Route path = '/clan/:clanId' element = {<Clan/>} />
      </Routes>

    </Layout>

    </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
