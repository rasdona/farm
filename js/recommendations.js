const Recommendations = {
  getRecommendedJobs(worker) {
    if (!worker) return [];
    const jobs = DB.getJobs().filter(j => j.status === 'active');
    const workerSkills = (worker.skills || []).map(s => s.toLowerCase());
    const workerDistrict = (worker.district || '').toLowerCase();
    const applied = DB.getApplicationsByWorker(worker.id).map(a => a.jobId);

    return jobs
      .filter(j => !applied.includes(j.id))
      .map(j => {
        let score = 0;
        const jobSkills = (j.requiredSkills || []).map(s => s.toLowerCase());
        const skillMatches = jobSkills.filter(s => workerSkills.includes(s)).length;
        if (jobSkills.length > 0) score += (skillMatches / jobSkills.length) * 40;
        if (j.district && j.district.toLowerCase() === workerDistrict) score += 30;
        else if (j.province && j.province === worker.province) score += 15;
        if (j.wage && j.wage.daily) {
          const expected = worker.expectedWage?.daily || 0;
          if (expected > 0) {
            const ratio = j.wage.daily / expected;
            if (ratio >= 0.9 && ratio <= 1.3) score += 20;
            else if (ratio >= 0.7) score += 10;
          } else {
            score += 10;
          }
        }
        if (j.foodProvided) score += 3;
        if (j.accommodationProvided) score += 5;
        if (j.urgent) score += 5;
        return { job: j, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.job);
  },

  getRecommendedWorkers(farmer) {
    if (!farmer) return [];
    const workers = DB.getUsers().filter(u => {
      const roles = u.roles || [u.role];
      return roles.includes('worker') && !u.suspended && u.id !== farmer.id;
    });
    const farmerDistrict = (farmer.district || '').toLowerCase();
    const farmerJobs = DB.getJobsByFarmer(farmer.id);
    const neededSkills = [...new Set(farmerJobs.flatMap(j => j.requiredSkills || []).map(s => s.toLowerCase()))];

    return workers
      .map(w => {
        let score = 0;
        const wSkills = (w.skills || []).map(s => s.toLowerCase());
        if (neededSkills.length > 0) {
          const matches = neededSkills.filter(s => wSkills.includes(s)).length;
          score += (matches / neededSkills.length) * 35;
        }
        const rating = parseFloat(DB.getAvgRating(w.id)) || 0;
        score += rating * 8;
        if ((w.district || '').toLowerCase() === farmerDistrict) score += 25;
        else if (w.province === farmer.province) score += 12;
        if (w.verified) score += 10;
        const experience = w.experienceYears || w.experience || 0;
        if (experience >= 3) score += 8;
        else if (experience >= 1) score += 4;
        const reviews = DB.getReviews(w.id).length;
        score += Math.min(reviews * 2, 10);
        return { worker: w, score: Math.round(score) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.worker);
  },

  renderRecommendedJobs(containerId) {
    const user = Auth.currentUser;
    if (!user || !containerId) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    const jobs = this.getRecommendedJobs(user);
    if (!jobs.length) {
      el.innerHTML = '<p class="text-muted text-center py-4">No recommendations yet. Complete your profile to get personalized job suggestions.</p>';
      return;
    }
    el.innerHTML = `<div class="grid grid-auto gap-4">${jobs.map(j => App.renderJobCard(j)).join('')}</div>`;
  },

  renderRecommendedWorkers(containerId) {
    const user = Auth.currentUser;
    if (!user || !containerId) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    const workers = this.getRecommendedWorkers(user);
    if (!workers.length) {
      el.innerHTML = '<p class="text-muted text-center py-4">No worker recommendations yet.</p>';
      return;
    }
    el.innerHTML = `<div class="grid grid-auto gap-4">${workers.map(w => App.renderWorkerCard(w)).join('')}</div>`;
  }
};
