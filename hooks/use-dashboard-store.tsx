import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { create } from "zustand";

import { type AppState } from "@/types/app-state";

// this is our useDashboardStore hook that we can use in our components to get parts of the store and call actions
const useDashboardStore = create<AppState>((set, get) => ({
  nodes: [
    // {
    //   id: "node-1",
    //   type: "welcomeCard",
    //   position: { x: 0, y: 0 },
    //   data: { value: 123 },
    // },
  ],
  edges: [],
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setNodes: (nodes) => {
    set({ nodes });
  },
  setEdges: (edges) => {
    set({ edges });
  },
}));

export default useDashboardStore;
