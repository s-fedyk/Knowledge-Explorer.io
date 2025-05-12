import React, { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import EmptyState from "./EmptyState";
import FolderView from "./FolderView";

function FileSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is already logged in on component mount
  useEffect(() => {
    // Check for existing auth token
    const token = localStorage.getItem("googleAuthToken");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    console.log(credentialResponse);
    localStorage.setItem("googleAuthToken", credentialResponse.credential);
    setIsLoggedIn(true);
  };

  return (
    <div className="h-full">
      <input
        type="file"
        className="hidden"
        onChange={() => {}}
        multiple
        webkitdirectory="true"
        directory="true"
      />

      {isLoggedIn ? (
        <div className="flex text-gray-200 border-b border-gray-400 border-t">
          <button
            className={`hover:bg-gray-200 hover:text-white transition-colors `}
            title="Back"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            className={`hover:bg-gray-200 hover:text-white transition-colors`}
            title="Forward"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleLoginSuccess}
          onError={() => {
            console.log("Login Failed");
          }}
        />
      )}

      <FolderView />
    </div>
  );
}

export default FileSystem;
