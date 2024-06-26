
DROP FUNCTION IF EXISTS elwood.create_node_id(text, text, uuid);
CREATE OR REPLACE FUNCTION elwood.create_node_id(
  p_type public.elwood_node_type,
  p_bucket text default null,
  p_object_id uuid default null
) RETURNS text
AS $$
DECLARE 
  _node_id text[];
  _prefix_part text;
  _prefix_parts text[];
BEGIN
  _node_id := ARRAY['urn', 'enid', lower(p_type::text)];

  IF p_bucket IS NOT NULL THEN    
    _node_id := _node_id || ARRAY[p_bucket::text];
  END IF;

  IF p_object_id IS NOT NULL THEN
    _node_id := _node_id || ARRAY[p_object_id::text];
  END IF;
  
  return array_to_string(_node_id,':');
END;
$$ language plpgsql;



DROP FUNCTION IF EXISTS elwood.create_node_id_for_tree(text[]);
CREATE OR REPLACE FUNCTION elwood.create_node_id_for_tree(
  p_path text[]
) RETURNS text
AS $$
DECLARE 
  _bucket_id text;
  _name text[];
  _object_row storage.objects;  
  _path_length int;
BEGIN
  _path_length := array_length(p_path, 1);
  _bucket_id := ARRAY_TO_STRING(p_path[:1], '');
  _name := p_path[2:] || ARRAY['.emptyFolderPlaceholder'];
  
  RAISE WARNING 'create_node_id_for_tree: p_path % || %', p_path, array_to_string(_name, '/');

  SELECT * INTO _object_row FROM storage.objects WHERE "bucket_id" = _bucket_id AND "name" = array_to_string(_name, '/');

  IF _object_row IS NULL THEN
    return 'urn:enid:no_object_row_found';
  END IF;
  
  return elwood.create_node_id('TREE', _bucket_id, _object_row.id);

END;
$$ language plpgsql;
