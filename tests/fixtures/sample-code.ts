// Test fixtures for integration tests
export const sampleTypeScriptCode = `interface User {
  id: number;
  name: string;
  email: string;
  isActive?: boolean;
}

class UserService {
  private users: User[] = [];

  constructor() {
    this.users = [];
  }

  addUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      id: Math.random(),
      ...user
    };
    this.users.push(newUser);
    return newUser;
  }

  findUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }

  getAllUsers(): User[] {
    return this.users.filter(user => user.isActive !== false);
  }

  updateUser(id: number, updates: Partial<User>): User | null {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return null;
    }
    
    this.users[userIndex] = { ...this.users[userIndex], ...updates };
    return this.users[userIndex];
  }
}

export const userService = new UserService();

// Function to demonstrate references
export function createTestUser(): User {
  return userService.addUser({
    name: "Test User",
    email: "test@example.com",
    isActive: true
  });
}

// Variable to demonstrate hover
const defaultUser: User = {
  id: 0,
  name: "Default",
  email: "default@example.com"
};

export default UserService;
`;

export const sampleWithImports = `import React from "react";
import { useState, useEffect } from "react";
import * as fs from "fs";
import { UserService } from "./user-service";
import { utils } from "../utils/helpers";
import path from "path";

export interface Props {
  userId: number;
  onUserUpdate: (user: User) => void;
}

export const UserComponent: React.FC<Props> = ({ userId, onUserUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userService = new UserService();
    const foundUser = userService.findUserById(userId);
    setUser(foundUser || null);
    setLoading(false);
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
`;

export const sampleWithErrors = `interface InvalidUser {
  id: number;
  name: string;
  email: string;
}

function processUser(user: InvalidUser): void {
  // This will have a reference error
  console.log(nonExistentVariable);
  
  // This will have a type error
  const userId: string = user.id;
  
  // This will have an unused variable
  const unusedVar = "hello";
}

// Unused function
function unusedFunction() {
  return "unused";
}

export default processUser;
`;