// /frontend/src/components/dashboard/TaskPieChart.tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from "@/components/ui/Card";

interface TaskPieChartProps {
  data: any; // The raw scraped_data json
}

const COLORS = ['#89DDFF', '#82AAFF']; // accent.primary, accent.secondary

export default function TaskPieChart({ data }: TaskPieChartProps) {
  const processData = () => {
    let quizCount = 0;
    let assignmentCount = 0;

    if (data?.quizzes?.quizzes_without_results) {
      quizCount = data.quizzes.quizzes_without_results.length;
    }
    if (data?.assignments?.assignments) {
      assignmentCount = data.assignments.assignments.length;
    }

    return [
      { name: 'Quizzes', value: quizCount },
      { name: 'Assignments', value: assignmentCount },
    ];
  };

  const chartData = processData();
  const totalTasks = chartData.reduce((sum, entry) => sum + entry.value, 0);

  if (totalTasks === 0) {
    return (
        <Card className="p-4 h-full flex flex-col">
            <h3 className="font-heading text-sm text-text-secondary mb-2">{`// TASK TYPE ANALYSIS`}</h3>
            <div className="flex-grow flex items-center justify-center">
                <p className="text-text-secondary font-mono">No upcoming tasks detected.</p>
            </div>
        </Card>
    );
  }

  return (
    <Card className="p-4">
        <h3 className="font-heading text-sm text-text-secondary mb-2">{`// TASK TYPE ANALYSIS`}</h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                >
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        background: "rgba(37, 37, 40, 0.9)",
                        border: "1px solid #8F93A2",
                        color: "#C3E88D",
                        fontFamily: "'Fira Code', monospace"
                    }}
                />
                <Legend wrapperStyle={{ fontFamily: "'Fira Code', monospace", color: "#C3E88D" }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </Card>
  );
}