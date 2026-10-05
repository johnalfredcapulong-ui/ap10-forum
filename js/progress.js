import { supabase } from './supabase.js';

// Get progress for a module for the current user
export async function getModuleProgress(moduleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { completed: 0, total: 0, percent: 0 };

  // Total materials in module (kind = reading or documentary — things you can "complete")
  const { count: total } = await supabase
    .from('materials')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', moduleId);

  // Completed materials
  const { count: completed } = await supabase
    .from('completed_materials')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('module_id', moduleId);

  const t = total || 0;
  const c = completed || 0;
  return {
    completed: c,
    total: t,
    percent: t > 0 ? Math.round((c / t) * 100) : 0,
  };
}

// Mark a material as completed for the current user
export async function markMaterialComplete(materialId, moduleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('completed_materials').insert({
    user_id: user.id,
    material_id: materialId,
    module_id: moduleId,
  });

  // Ensure enrollment exists
  await supabase.from('module_enrollments').insert({
    user_id: user.id,
    module_id: moduleId,
  });
}

// Overall progress across all modules for the current user
export async function getUserOverallProgress() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { completed: 0, total: 0, percent: 0 };

  const [{ count: total }, { count: completed }] = await Promise.all([
    supabase.from('materials').select('*', { count: 'exact', head: true }),
    supabase.from('completed_materials')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const t = total || 0;
  const c = completed || 0;
  return {
    completed: c,
    total: t,
    percent: t > 0 ? Math.round((c / t) * 100) : 0,
  };
}

// Get counts of materials marked complete in a specific module
export async function getModuleCompletedCount(moduleId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from('completed_materials')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('module_id', moduleId);

  return count || 0;
}