import { FieldDefinition, ModelDefinition } from '../config.js';

export interface DriftFieldMapping {
  name: string;              // snake_case field name
  dartName: string;          // Original camelCase name
  dartType: string;          // Original Dart type
  sqlType: 'integer' | 'text' | 'real' | 'blob' | 'boolean' | 'dateTime';
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  defaultValue?: string | number | boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'cascade' | 'setNull' | 'restrict' | 'noAction';
  };
}

export interface DriftTableSchema {
  name: string;              // snake_case table name
  dartClassName: string;     // Original PascalCase name
  fields: DriftFieldMapping[];
  relationships: {
    type: 'hasOne' | 'hasMany';
    relatedTable: string;
    foreignKey: string;
  }[];
  timestamps: boolean;
  softDelete: boolean;
}

/**
 * Convert Dart type to SQL type for Drift
 */
export function dartTypeToSqlType(dartType: string): 'integer' | 'text' | 'real' | 'blob' | 'boolean' | 'dateTime' {
  const normalized = dartType.replace(/[?]/g, '').trim();

  if (normalized === 'int' || normalized === 'Int' || normalized === 'Integer') {
    return 'integer';
  }
  if (normalized === 'double' || normalized === 'Double' || normalized === 'num' || normalized === 'Num') {
    return 'real';
  }
  if (normalized === 'bool' || normalized === 'Bool' || normalized === 'boolean' || normalized === 'Boolean') {
    return 'boolean';
  }
  if (normalized === 'DateTime') {
    return 'dateTime';
  }
  if (normalized.startsWith('List<') || normalized.startsWith('Uint8List')) {
    return 'blob';
  }
  // Default to text for String and all other types (enums, custom classes)
  return 'text';
}

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert PascalCase to snake_case for table names
 */
export function classNameToTableName(className: string): string {
  return toSnakeCase(className);
}

/**
 * Map a single field to Drift format
 */
export function mapFieldToDrift(field: FieldDefinition): DriftFieldMapping {
  const nullable = field.type.includes('?');
  const isPrimaryKey = field.name === 'id' || field.annotations.some(a => a.includes('@primaryKey'));
  const isAutoIncrement = isPrimaryKey && dartTypeToSqlType(field.type) === 'integer';

  // Detect foreign key from field name (e.g., userId, authorId)
  let references: DriftFieldMapping['references'];
  if (field.name.endsWith('Id') && !isPrimaryKey) {
    const relatedTable = toSnakeCase(field.name.replace(/Id$/, ''));
    references = {
      table: relatedTable,
      column: 'id',
      onDelete: 'cascade',
    };
  }

  return {
    name: toSnakeCase(field.name),
    dartName: field.name,
    dartType: field.type,
    sqlType: dartTypeToSqlType(field.type),
    nullable,
    unique: field.annotations.some(a => a.includes('@unique')),
    primaryKey: isPrimaryKey,
    autoIncrement: isAutoIncrement,
    defaultValue: field.defaultValue,
    references,
  };
}

/**
 * Convert ModelDefinition to DriftTableSchema
 */
export function modelToDriftSchema(model: ModelDefinition): DriftTableSchema {
  const tableName = classNameToTableName(model.name);
  const fields = model.fields.map(mapFieldToDrift);

  // Ensure primary key exists
  const hasPrimaryKey = fields.some(f => f.primaryKey);
  if (!hasPrimaryKey) {
    // Add auto-incrementing id as primary key
    fields.unshift({
      name: 'id',
      dartName: 'id',
      dartType: 'int',
      sqlType: 'integer',
      nullable: false,
      unique: true,
      primaryKey: true,
      autoIncrement: true,
    });
  }

  // Map relationships to Drift format
  const relationships = model.relationships.map(rel => ({
    type: rel.type === 'hasOne' ? 'hasOne' as const : 'hasMany' as const,
    relatedTable: classNameToTableName(rel.target),
    foreignKey: toSnakeCase(rel.fieldName) + '_id',
  }));

  // Check if model has timestamps (createdAt, updatedAt)
  const hasCreatedAt = model.fields.some(f => f.name === 'createdAt');
  const hasUpdatedAt = model.fields.some(f => f.name === 'updatedAt');
  const timestamps = hasCreatedAt && hasUpdatedAt;

  // Check if model has soft delete (deletedAt)
  const softDelete = model.fields.some(f => f.name === 'deletedAt');

  return {
    name: tableName,
    dartClassName: model.name,
    fields,
    relationships,
    timestamps,
    softDelete,
  };
}

/**
 * Convert array of models to Drift schemas
 */
export function modelsToDriftSchemas(models: ModelDefinition[]): DriftTableSchema[] {
  return models.map(modelToDriftSchema);
}
