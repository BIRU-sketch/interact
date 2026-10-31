(() => {
  let width = 0;
  let height = 0;
  let worldPerPixel = 0;
  let isBuilt = false;

  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 6;

  const visibleHeight = 2 * 6 * Math.tan((20 * Math.PI) / 180);
  const wheelState = { x: 0, y: 0, radius: 0, rotation: 0, opacity: 0, reveal: 0, tilt: 0 };
  const scrollState = { progress: 0 };

  scene.add(new THREE.AmbientLight(0xfff3e6, 0.85));

  const keyLight = new THREE.PointLight(0xffffff, 1.4);
  keyLight.position.set(4, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x2563eb, 2.2);
  fillLight.position.set(-3, -2, 3);
  scene.add(fillLight);

  const textureLoader = new THREE.TextureLoader();
  const emblemTexture = textureLoader.load('/static/rotary_wheel_emblem.png');
  emblemTexture.anisotropy = renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 4;

  const teethCount = 24;
  const step = (Math.PI * 2) / teethCount;
  const gearShape = new THREE.Shape();
  const crownWidth = 0.16 * step;
  const valleyWidth = 0.36 * step;
  const tipRadius = 0.97;
  const valleyRadius = 0.835;

  for (let i = 0; i < teethCount; i++) {
    const mid = i * step;
    const a0 = mid - crownWidth;
    const a1 = mid + crownWidth;
    const a2 = mid + valleyWidth;
    const a3 = mid + step - valleyWidth;

    if (i === 0) {
      gearShape.moveTo(Math.cos(a0) * tipRadius, Math.sin(a0) * tipRadius);
    } else {
      gearShape.lineTo(Math.cos(a0) * tipRadius, Math.sin(a0) * tipRadius);
    }
    gearShape.lineTo(Math.cos(a1) * tipRadius, Math.sin(a1) * tipRadius);
    gearShape.lineTo(Math.cos(a2) * valleyRadius, Math.sin(a2) * valleyRadius);
    gearShape.lineTo(Math.cos(a3) * valleyRadius, Math.sin(a3) * valleyRadius);
  }
  gearShape.closePath();

  const hubRadius = 0.23;
  const rimRadius = 0.64;

  function createSpokeWindow(centerAngle, spanAngle) {
    const spoke = new THREE.Path();
    const half = spanAngle / 2;
    spoke.absarc(0, 0, rimRadius, centerAngle - half, centerAngle + half, false);
    spoke.absarc(0, 0, hubRadius, centerAngle + half, centerAngle - half, true);
    spoke.closePath();
    return spoke;
  }

  for (let i = 0; i < 6; i++) {
    gearShape.holes.push(createSpokeWindow(i * (Math.PI / 3), 0.70));
  }

  const hubHole = new THREE.Path();
  const axleRadius = 0.12;
  const keywayWidth = 0.035;
  const keywayHeight = 0.175;
  const keywayAngle = Math.asin(keywayWidth / axleRadius);

  hubHole.absarc(0, 0, axleRadius, Math.PI / 2 + keywayAngle, Math.PI * 2.5 - keywayAngle, false);
  hubHole.lineTo(keywayWidth, keywayHeight);
  hubHole.lineTo(-keywayWidth, keywayHeight);
  hubHole.closePath();
  gearShape.holes.push(hubHole);

  const gearGeometry = new THREE.ExtrudeGeometry(gearShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 36
  });
  gearGeometry.translate(0, 0, -0.06);

  const gearMaterial = new THREE.MeshStandardMaterial({
    color: 0x1296cc,
    metalness: 0.72,
    roughness: 0.22,
    transparent: true,
    opacity: 0
  });

  const wheelGroup = new THREE.Group();
  wheelGroup.add(new THREE.Mesh(gearGeometry, gearMaterial));

  const wireframeEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(gearGeometry, 32),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 })
  );
  wheelGroup.add(wireframeEdges);

  const emblemGeometry = new THREE.PlaneGeometry(2.0, 2.0);
  const emblemMatFront = new THREE.MeshStandardMaterial({
    map: emblemTexture,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.32,
    metalness: 0.45,
    opacity: 0,
    side: THREE.FrontSide
  });

  const emblemMeshFront = new THREE.Mesh(emblemGeometry, emblemMatFront);
  emblemMeshFront.position.z = 0.062;
  wheelGroup.add(emblemMeshFront);

  const emblemMatBack = new THREE.MeshStandardMaterial({
    map: emblemTexture,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.32,
    metalness: 0.45,
    opacity: 0,
    side: THREE.FrontSide
  });

  const emblemMeshBack = new THREE.Mesh(emblemGeometry, emblemMatBack);
  emblemMeshBack.position.z = -0.062;
  emblemMeshBack.rotation.y = Math.PI;
  wheelGroup.add(emblemMeshBack);

  const ringMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uT: { value: 0 }, uR: { value: 0 } },
    vertexShader: 'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uT;uniform float uR;varying vec2 vP;void main(){float r=length(vP);float edge=.24+uR*.5;float m=1.-smoothstep(edge-.02,edge+.03,r);vec2 g=abs(fract(vP*16.)-.5);float line=smoothstep(.45,.5,max(g.x,g.y));float sheen=sin((vP.x+vP.y)*7.-uT*1.6)*.5+.5;vec3 base=mix(vec3(.06,.45,.82),vec3(.12,.65,1.),clamp((r-.2)*1.6,0.,1.));vec3 col=base*(.6+.4*sheen)+line*vec3(.65,.88,1.)*.35;float front=exp(-pow((r-edge)*38.,2.));col+=front*vec3(.95,.98,1.);gl_FragColor=vec4(col,m*.95);}'
  });

  const ringGeometry = new THREE.RingGeometry(0.84, 1.02, 48);
  const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.position.z = 0.064;
  wheelGroup.add(ringMesh);

  const anchor = new THREE.Object3D();
  anchor.position.set(0.48 * Math.cos(Math.PI / 6), 0.48 * Math.sin(Math.PI / 6), 0.08);
  wheelGroup.add(anchor);
  scene.add(wheelGroup);

  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  const clock = new THREE.Clock();

  const tag = document.getElementById('tag');
  const tagNum = document.getElementById('tag-num');
  const tagTitle = document.getElementById('tag-title');
  const tagSub = document.getElementById('tag-sub');
  const hudPosition = new THREE.Vector3();

  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / width) * 2 - 1;
    mouseY = (e.clientY / height) * 2 - 1;
  });

  const tagData = [
    { num: 'Youth Leadership', title: 'Interact Club', sub: 'High School Community' },
    { num: 'Community Service', title: 'Service Above Self', sub: 'Bahir Dar, Ethiopia' },
    { num: 'Global Fellowship', title: 'Rotary District 9212', sub: 'Local Impact' }
  ];

  function loop() {
    const elapsed = clock.getElapsedTime();
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    wheelGroup.scale.setScalar(Math.max(wheelState.radius, 0.001) * worldPerPixel);
    wheelGroup.position.set((wheelState.x - width / 2) * worldPerPixel, -(wheelState.y - height / 2) * worldPerPixel, 0);
    wheelGroup.rotation.set(
      targetY * 0.25 * wheelState.tilt,
      targetX * 0.3 * wheelState.tilt,
      wheelState.rotation + Math.sin(elapsed * 0.5) * 0.012 * wheelState.tilt
    );

    gearMaterial.opacity = wheelState.opacity;
    emblemMatFront.opacity = wheelState.opacity;
    emblemMatBack.opacity = wheelState.opacity;
    wireframeEdges.material.opacity = wheelState.opacity * 0.55;
    wheelGroup.visible = wheelState.opacity > 0.005;

    ringMaterial.uniforms.uR.value = wheelState.reveal;
    ringMaterial.uniforms.uT.value = elapsed;

    renderer.render(scene, camera);

    if (wheelState.reveal > 0.02 && scrollState.progress < 0.25) {
      anchor.getWorldPosition(hudPosition);
      hudPosition.project(camera);
      tag.style.left = `${(hudPosition.x * 0.5 + 0.5) * width + 45}px`;
      tag.style.top = `${(-hudPosition.y * 0.5 + 0.5) * height}px`;
      tag.style.opacity = Math.max(0, (wheelState.reveal - 0.6) / 0.4);

      const curIdx = Math.min(2, Math.floor(scrollState.progress * 10));
      if (tagNum && tagData[curIdx]) {
        tagNum.textContent = tagData[curIdx].num;
        tagTitle.textContent = tagData[curIdx].title;
        tagSub.textContent = tagData[curIdx].sub;
      }
    } else {
      tag.style.opacity = 0;
    }

    requestAnimationFrame(loop);
  }

  const lockup = document.getElementById('lockup');
  const mark = document.querySelector('.mark');
  const t1 = document.getElementById('t1');
  const txt = document.querySelector('.txt');
  const hero = document.getElementById('hero');
  const hint = document.getElementById('hint');
  const barFill = document.querySelector('#bar i');
  const aboutSection = document.getElementById('about-section');
  const projectsSection = document.getElementById('projects-section');
  const projectsSlider = document.getElementById('projects-slider');
  const projCounter = document.getElementById('proj-counter');
  const projBarFill = document.getElementById('proj-bar-fill');
  const contactSection = document.getElementById('contact-section');
  const navAbout = document.getElementById('nav-about');
  const navProjects = document.getElementById('nav-projects');

  t1.innerHTML = t1.textContent.split('').map((c) => `<span>${c}</span>`).join('');

  const initialMark = { x: 0, y: 0, radius: 0 };
  let heroWheelRadius = 0;
  let lockupTextWidth = 0;

  function sizeRenderer() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    worldPerPixel = visibleHeight / height;

    const rect = mark.getBoundingClientRect();
    initialMark.x = rect.left + rect.width / 2;
    initialMark.y = rect.top + rect.height / 2;
    initialMark.radius = rect.width / 2;
    heroWheelRadius = Math.min(height * 0.44, width * 0.48);
    lockupTextWidth = txt.offsetWidth;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function updateScene() {
    const progress = scrollState.progress;

    navAbout.classList.toggle('active-link', progress >= 0.22 && progress < 0.54);
    navProjects.classList.toggle('active-link', progress >= 0.54 && progress < 0.84);

    const introProgress = Math.min(1, progress / 0.22);
    const moveProg = easeInOut(Math.min(1, introProgress / 0.8));
    const isMobile = width < 768;

    if (isMobile) {
      const lockUpShift = moveProg * (height * 0.38);
      const lockScale = 1 - 0.22 * moveProg;
      const mobOp = Math.max(0, 1 - moveProg * 1.6);

      lockup.style.left = '50%';
      lockup.style.top = `${height / 2 - lockUpShift}px`;
      lockup.style.transform = `translate(-50%, -50%) scale(${lockScale})`;
      lockup.style.opacity = mobOp;

      mark.style.width = `${initialMark.radius * 2}px`;
      mark.style.opacity = 1;

      const rc = mark.getBoundingClientRect();
      wheelState.x = rc.left + rc.width / 2;
      wheelState.y = rc.top + rc.height / 2;
      wheelState.radius = rc.width / 2;
      wheelState.rotation = (Math.PI * 2) * Math.min(1, introProgress);
      wheelState.opacity = mobOp;
      wheelState.tilt = 0;
      wheelState.reveal = 0;
    } else {
      wheelState.x = initialMark.x + (0 - initialMark.x) * moveProg;
      wheelState.y = initialMark.y + (height / 2 - initialMark.y) * moveProg;
      wheelState.radius = initialMark.radius + (heroWheelRadius - initialMark.radius) * moveProg;
      wheelState.rotation = (Math.PI * 2 + Math.PI * 11 / 6) * Math.min(1, introProgress);
      wheelState.reveal = Math.min(1, Math.max(0, (introProgress - 0.4) / 0.6));
      wheelState.tilt = Math.min(1, Math.max(0, (introProgress - 0.6) / 0.4));
      wheelState.opacity = 1;

      const lockX = (width / 2) + (width * 0.94 - lockupTextWidth - (width / 2)) * moveProg;
      const lockY = (height / 2) + (height * 0.14 - (height / 2)) * moveProg;
      const lockScale = 1 - 0.42 * moveProg;
      const lockShift = -50 * (1 - moveProg);
      lockup.style.left = `${lockX}px`;
      lockup.style.top = `${lockY}px`;
      lockup.style.transform = `translate(${lockShift}%, ${lockShift}%) scale(${lockScale})`;
      lockup.style.opacity = 1;

      const markFade = Math.min(1, introProgress / 0.6);
      mark.style.width = `${initialMark.radius * 2 * (1 - markFade)}px`;
      mark.style.opacity = 1 - markFade;
    }

    if (introProgress > 0.45) {
      const heroProg = (introProgress - 0.45) / 0.55;
      hero.style.opacity = heroProg;
      hero.style.transform = `translateY(${(1 - heroProg) * 24 - 50}%)`;
    } else {
      hero.style.opacity = 0;
      hero.style.transform = 'translateY(calc(-50% + 24px))';
    }

    if (hint) {
      hint.style.opacity = introProgress > 0.05 ? Math.max(0, 1 - introProgress * 8) : 1;
    }
    if (barFill) {
      barFill.style.transform = `scaleY(${progress})`;
    }

    if (progress < 0.22) {
      aboutSection.style.transform = 'translate3d(0, 100vh, 0)';
      aboutSection.style.opacity = '1';
      aboutSection.style.pointerEvents = 'none';
    } else if (progress <= 0.36) {
      const tAboutIn = Math.min(1, Math.max(0, (progress - 0.22) / 0.14));
      const yPercent = (1 - easeInOutSine(tAboutIn)) * 100;
      aboutSection.style.transform = `translate3d(0, ${yPercent}vh, 0)`;
      aboutSection.style.opacity = '1';
      aboutSection.style.pointerEvents = 'auto';
    } else if (progress <= 0.44) {
      aboutSection.style.transform = 'translate3d(0, 0vh, 0)';
      aboutSection.style.opacity = '1';
      aboutSection.style.pointerEvents = 'auto';
    } else if (progress <= 0.58) {
      const tAboutOut = Math.min(1, Math.max(0, (progress - 0.44) / 0.14));
      const easedOut = easeInOutSine(tAboutOut);
      const yPercentOut = -easedOut * 100;
      const opOut = 1 - easeInOut(tAboutOut);
      aboutSection.style.transform = `translate3d(0, ${yPercentOut}vh, 0)`;
      aboutSection.style.opacity = opOut;
      aboutSection.style.pointerEvents = 'none';
    } else {
      aboutSection.style.transform = 'translate3d(0, -100vh, 0)';
      aboutSection.style.opacity = '0';
      aboutSection.style.pointerEvents = 'none';
    }

    if (progress < 0.44) {
      projectsSection.style.visibility = 'hidden';
      projectsSection.style.opacity = '0';
      projectsSection.style.pointerEvents = 'none';
    } else if (progress < 0.58) {
      const tReveal = Math.min(1, Math.max(0, (progress - 0.44) / 0.14));
      const revealEase = easeOut(tReveal);
      const cardScale = 0.96 + 0.04 * revealEase;
      projectsSection.style.visibility = 'visible';
      projectsSection.style.opacity = (0.35 + 0.65 * revealEase).toFixed(3);
      projectsSlider.style.transform = `translate3d(0, ${(1 - revealEase) * 18}px, 0) scale(${cardScale})`;
      projCounter.textContent = '01 / 04';
      projBarFill.style.width = '25%';
      projectsSection.style.pointerEvents = 'none';
    } else if (progress <= 0.82) {
      projectsSection.style.visibility = 'visible';
      projectsSection.style.opacity = '1';
      projectsSection.style.pointerEvents = 'auto';
      const tProjRaw = Math.min(1, Math.max(0, (progress - 0.58) / 0.24));
      const tProj = easeInOutSine(tProjRaw);
      const maxShift = Math.max(0, projectsSlider.scrollWidth - width + 80);
      projectsSlider.style.transform = `translate3d(${-tProj * maxShift}px, 0, 0) scale(1)`;

      const curNum = Math.min(4, Math.max(1, Math.floor(tProj * 3.99) + 1));
      projCounter.textContent = `0${curNum} / 04`;
      projBarFill.style.width = `${(tProj * 0.75 + 0.25) * 100}%`;
    } else {
      projectsSection.style.visibility = 'visible';
      projectsSection.style.opacity = '1';
      const maxShift = Math.max(0, projectsSlider.scrollWidth - width + 80);
      projectsSlider.style.transform = `translate3d(${-maxShift}px, 0, 0) scale(1)`;
      projCounter.textContent = '04 / 04';
      projBarFill.style.width = '100%';
      projectsSection.style.pointerEvents = progress < 0.84 ? 'auto' : 'none';
    }

    if (progress < 0.82) {
      contactSection.style.transform = 'translate3d(0, 100vh, 0)';
      contactSection.style.pointerEvents = 'none';
    } else {
      const tContact = Math.min(1, Math.max(0, (progress - 0.82) / 0.16));
      const yPercentContact = (1 - easeOutQuart(tContact)) * 100;
      contactSection.style.transform = `translate3d(0, ${yPercentContact}vh, 0)`;
      contactSection.style.pointerEvents = 'auto';
    }
  }

  function scrub() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const rawProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    gsap.to(scrollState, {
      progress: rawProgress,
      duration: 0.85,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: updateScene
    });
  }

  let introTimeline;
  function build(playIntro) {
    sizeRenderer();

    if (playIntro) {
      wheelState.x = initialMark.x;
      wheelState.y = initialMark.y;
      wheelState.radius = initialMark.radius * 0.6;
      wheelState.rotation = -1.6;
      wheelState.opacity = 0;
      wheelState.reveal = 0;
      wheelState.tilt = 0;

      introTimeline = gsap.timeline({ onComplete: ready });
      introTimeline.from('#t1 span', { y: 30, opacity: 0, duration: 1, stagger: 0.05, ease: 'power3.out' }, 0)
        .from('.t2,.t3', { y: 14, opacity: 0, duration: 0.9, stagger: 0.15, ease: 'power3.out' }, 0.5)
        .to(wheelState, { opacity: 1, radius: initialMark.radius, rotation: 0, duration: 1.8, ease: 'power3.out' }, 0.35);
    } else {
      wheelState.x = initialMark.x;
      wheelState.y = initialMark.y;
      wheelState.radius = initialMark.radius;
      wheelState.rotation = 0;
      wheelState.opacity = 1;
      wheelState.reveal = 0;
      wheelState.tilt = 0;
      ready();
      updateScene();
    }
  }

  function ready() {
    isBuilt = true;
    gsap.to('#hint', { opacity: 1, duration: 1, onComplete: () => { updateScene(); } });
    scrub();
  }

  let resizeTimer;
  window.addEventListener('scroll', () => {
    if (introTimeline && introTimeline.isActive()) {
      introTimeline.kill();
      wheelState.opacity = 1;
      isBuilt = true;
    }
    scrub();
  }, { passive: true });

  window.addEventListener('wheel', () => {
    if (introTimeline && introTimeline.isActive()) {
      introTimeline.kill();
      wheelState.opacity = 1;
      isBuilt = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isBuilt) build(false);
    }, 150);
  });

  sizeRenderer();
  loop();

  const init = (() => {
    let called = false;
    return () => {
      if (!called) {
        called = true;
        build(true);
      }
    };
  })();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
    setTimeout(init, 300);
  } else {
    init();
  }

  window.jumpTo = (section) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    let targetProg = 0;
    if (section === 'intro') targetProg = 0.0;
    else if (section === 'about') targetProg = 0.40;
    else if (section === 'projects') targetProg = 0.62;
    else if (section === 'contact') targetProg = 1.0;

    window.scrollTo({ top: targetProg * max, behavior: 'smooth' });
  };

  document.getElementById('nav-brand').addEventListener('click', () => jumpTo('intro'));
  document.getElementById('nav-about').addEventListener('click', () => jumpTo('about'));
  document.getElementById('nav-projects').addEventListener('click', () => jumpTo('projects'));

  const navContactBtn = document.getElementById('nav-contact');
  if (navContactBtn) {
    navContactBtn.addEventListener('click', () => jumpTo('contact'));
  }

  ['nav-events', 'nav-team', 'nav-gallery', 'nav-join'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
      });
    }
  });

  const projectDetails = [
    {
      tag: 'Community Initiative',
      title: 'In Planning',
      desc: 'Our high school members are currently planning upcoming community service initiatives for this term. Check back soon or reach out to get involved.',
      impact: 'Projects launching soon'
    }
  ];

  window.openProjectModal = (idx) => {
    const item = projectDetails[idx];
    if (!item) return;
    document.getElementById('modal-tag').textContent = item.tag;
    document.getElementById('modal-title').textContent = item.title;
    document.getElementById('modal-desc').textContent = item.desc;
    document.getElementById('modal-impact').textContent = item.impact;
    document.getElementById('project-modal').classList.add('active');
  };

  window.closeProjectModal = () => {
    document.getElementById('project-modal').classList.remove('active');
  };

  const contactForm = document.getElementById('club-contact-form');
  const toastEl = document.getElementById('toast-notification');
  let toastTimer;

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      contactForm.reset();
      clearTimeout(toastTimer);
      toastEl.classList.add('show');
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
      }, 4200);
    });
  }

  window.toggleMobileMenu = (open) => {
    const btn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('mobile-nav-overlay');
    if (!overlay) return;
    const isOpen = (typeof open === 'boolean') ? open : !overlay.classList.contains('active');
    if (isOpen) {
      overlay.classList.add('active');
      if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
      document.body.style.overflow = 'hidden';
    } else {
      overlay.classList.remove('active');
      if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    }
  };

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleMobileMenu(false);
    }
  });
})();
