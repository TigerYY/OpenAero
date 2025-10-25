--
-- PostgreSQL database dump
--

\restrict ubiYmiHsaAYU7p0dVIVxNoZ5PRdKAT8f3jkKxp2IiFriQOUHPqJn805lWbb1C6h

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO openaero;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: openaero
--

ALTER DEFAULT PRIVILEGES FOR ROLE openaero IN SCHEMA public GRANT ALL ON SEQUENCES  TO openaero;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: openaero
--

ALTER DEFAULT PRIVILEGES FOR ROLE openaero IN SCHEMA public GRANT ALL ON FUNCTIONS  TO openaero;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: openaero
--

ALTER DEFAULT PRIVILEGES FOR ROLE openaero IN SCHEMA public GRANT ALL ON TABLES  TO openaero;


--
-- PostgreSQL database dump complete
--

\unrestrict ubiYmiHsaAYU7p0dVIVxNoZ5PRdKAT8f3jkKxp2IiFriQOUHPqJn805lWbb1C6h

