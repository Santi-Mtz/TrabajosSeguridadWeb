--
-- PostgreSQL database dump
--


-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, username, email, password_hash, is_active, created_at) VALUES (2, 'nuevo_usuario', 'nuevo@correo.com', '$2a$06$r35t.wOmAsSBtJZU7HxRPu6spQI3dVdx4gE6FgtcShN1ouE9F1hwG', true, '2026-03-27 23:20:38.605302+00');
INSERT INTO public.users (id, username, email, password_hash, is_active, created_at) VALUES (3, 'registro_user', 'registro@correo.com', '$2a$06$pnQOfpnUT/D0WTr5xJQDX.gx/8GkZtwl51d/Qns/AXzBtYWIxGy8.', true, '2026-03-27 23:20:52.378661+00');
INSERT INTO public.users (id, username, email, password_hash, is_active, created_at) VALUES (1, 'admin_actualizado', 'admin_actualizado@correo.com', '$2a$06$mkT9JH6LMKcxSeRRaTBL8u/dOUk8gXjQoGcThWrdgGLKxqYFoAcNC', true, '2026-03-27 23:15:12.336256+00');


--
-- Data for Name: login_events; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.login_events (id, user_id, email_attempt, success, ip_address, user_agent, created_at) VALUES (1, 1, 'admin@correo.com', true, '127.0.0.1', 'psql test', '2026-03-27 23:15:37.173286+00');
INSERT INTO public.login_events (id, user_id, email_attempt, success, ip_address, user_agent, created_at) VALUES (2, 1, 'admin@correo.com', true, '127.0.0.1', 'sql-editor', '2026-03-27 23:20:12.66162+00');


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.permissions (id, code, description) VALUES (1, 'ticket:view', 'Ver tickets');
INSERT INTO public.permissions (id, code, description) VALUES (2, 'ticket:add', 'Crear tickets');
INSERT INTO public.permissions (id, code, description) VALUES (3, 'user:view:all', 'Ver usuarios');


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_permissions (user_id, permission_id) VALUES (1, 1);
INSERT INTO public.user_permissions (user_id, permission_id) VALUES (1, 2);
INSERT INTO public.user_permissions (user_id, permission_id) VALUES (1, 3);


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.groups (id, name, description, created_by, created_at, updated_at) VALUES (1, 'Grupo de Administración', 'Grupo para administradores del sistema', 1, '2026-03-27 23:21:00+00', '2026-03-27 23:21:00+00');
INSERT INTO public.groups (id, name, description, created_by, created_at, updated_at) VALUES (2, 'Grupo de Desarrollo', 'Grupo para desarrolladores', 1, '2026-03-27 23:21:00+00', '2026-03-27 23:21:00+00');
INSERT INTO public.groups (id, name, description, created_by, created_at, updated_at) VALUES (3, 'Grupo de Seguridad', 'Grupo para gestionar seguridad', 1, '2026-03-27 23:21:00+00', '2026-03-27 23:21:00+00');


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.group_members (id, group_id, user_id, joined_at) VALUES (1, 1, 1, '2026-03-27 23:21:10+00');
INSERT INTO public.group_members (id, group_id, user_id, joined_at) VALUES (2, 2, 1, '2026-03-27 23:21:10+00');
INSERT INTO public.group_members (id, group_id, user_id, joined_at) VALUES (3, 3, 1, '2026-03-27 23:21:10+00');
INSERT INTO public.group_members (id, group_id, user_id, joined_at) VALUES (4, 1, 2, '2026-03-27 23:21:10+00');
INSERT INTO public.group_members (id, group_id, user_id, joined_at) VALUES (5, 2, 2, '2026-03-27 23:21:10+00');
INSERT INTO public.group_members (id, group_id, user_id, joined_at) VALUES (6, 3, 3, '2026-03-27 23:21:10+00');


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.tickets (id, title, description, status, group_id, assigned_to, created_by, created_at, updated_at) VALUES (1, 'Configurar BD', 'Configurar la base de datos Supabase', 'open', 1, 1, 1, '2026-03-27 23:21:20+00', '2026-03-27 23:21:20+00');
INSERT INTO public.tickets (id, title, description, status, group_id, assigned_to, created_by, created_at, updated_at) VALUES (2, 'Implementar UI', 'Implementar interfaz de usuario', 'in-progress', 2, 2, 1, '2026-03-27 23:21:20+00', '2026-03-27 23:21:20+00');
INSERT INTO public.tickets (id, title, description, status, group_id, assigned_to, created_by, created_at, updated_at) VALUES (3, 'Auditar seguridad', 'Realizar auditoría de seguridad del sistema', 'open', 3, 1, 1, '2026-03-27 23:21:20+00', '2026-03-27 23:21:20+00');


--
-- Name: login_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.login_events_id_seq', 2, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.permissions_id_seq', 6, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.groups_id_seq', 3, true);


--
-- Name: group_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_members_id_seq', 6, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tickets_id_seq', 3, true);


--
-- PostgreSQL database dump complete
--


