import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Authentication/Login';
import Signup from './Authentication/Signup';
import Dashboard from './Dashboard';
import Layout from './hooks/Layout';
import JoinClan from './Screens/JoinClan';
import GymBuddyFinder from './Screens/GymBuddyFinder';
import { Toaster } from "sonner";
import Notifications from './Screens/Notifications';
import Profile from './Screens/Profile';
import SearchScreen from './Screens/SearchScreen';
import Clan from './Screens/Clan';
import { socket } from './socket';
import { NotificationProvider } from './context/NotificationContext';
import NotificationListener from './Components/NotificationListener';
import ProfileListener from './Components/ProfileListener';
import { ProfileProvider } from './context/ProfileContext';
import Onboarding from './Screens/Onboarding';
import { MatchProvider } from './context/MatchContext';
import MatchListener from './Components/MatchListener';
import Chats from './Screens/Chats';
import ChatScreen from './Screens/ChatScreen';
import { ChatProvider } from './context/ChatContext';
import ChatListener from './Components/ChatListener';

function App() {
  return (
    <NotificationProvider>
      <ProfileProvider>
        <ChatProvider>
        <MatchProvider>
          
        <NotificationListener />
        <ProfileListener />
        <ChatListener/>
        <MatchListener/>

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

          <Routes>
            <Route path ='/' element={<Login />}/>

            <Route path='/login' element={<Login />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/onboarding' element={<Onboarding />} />


            <Route element={<Layout />}>
              <Route path='/dashboard' element={<Dashboard />} />
              <Route path='/join/gym/:gymId' element={<JoinClan />} />
              <Route path='/gym/buddy/finder' element={<GymBuddyFinder />} />
              <Route path='/notifications' element={<Notifications />} />
              <Route path='/profile' element={<Profile />} />
              <Route path='/search' element={<SearchScreen />} />
              <Route path='/clan/:clanId' element={<Clan />} />
              <Route path = '/chats' element={<Chats/>} />
              <Route path = '/chat' element = {<ChatScreen/>} />
              <Route path = '/chat/:userId/:receiverId' element={<ChatScreen/>}/>
            </Route>
          </Routes>
          
        </BrowserRouter>



        </MatchProvider>
        </ChatProvider>
      </ProfileProvider>
    </NotificationProvider>
  );
}

export default App;
