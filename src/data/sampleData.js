// Sample data - generic names only (no proprietary names)
export const createSampleProject = () => ({
  version: "1.0",
  project: {
    name: "New Project",
    startDate: "2025-04",
    endDate: "2026-03",
    granularity: "month",
  },
  tasks: [
    {
      id: "task-001",
      name: "Task A",
      location: "Location 1",
      assignee: "Person 1",
      startMonth: 0,
      endMonth: 2,
      color: "#4472C4",
      isMilestone: false,
      notes: "",
    },
    {
      id: "task-002",
      name: "Task B",
      location: "Location 2",
      assignee: "Person 2",
      startMonth: 1,
      endMonth: 5,
      color: "#ED7D31",
      isMilestone: false,
      notes: "",
    },
    {
      id: "task-003",
      name: "Milestone 1",
      location: "Location 1",
      assignee: "Person 1",
      startMonth: 3,
      endMonth: 3,
      color: "#70AD47",
      isMilestone: true,
      notes: "Review meeting",
    },
    {
      id: "task-004",
      name: "Task C",
      location: "Location 3",
      assignee: "Person 3",
      startMonth: 3,
      endMonth: 8,
      color: "#FFC000",
      isMilestone: false,
      notes: "",
    },
    {
      id: "task-005",
      name: "Task D",
      location: "Location 2",
      assignee: "Person 1",
      startMonth: 6,
      endMonth: 11,
      color: "#5B9BD5",
      isMilestone: false,
      notes: "",
    },
  ],
});

export const COLOR_PALETTE = [
  "#4472C4",
  "#ED7D31",
  "#70AD47",
  "#FFC000",
  "#5B9BD5",
  "#FF6384",
];

let idCounter = 100;
export const generateId = () => `task-${String(++idCounter).padStart(3, "0")}`;
