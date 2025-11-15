import databaseService from '../services/databaseService.js';
import { sendSuccess, sendNotFound, sendValidationError, sendSuccessWithMessage, asyncHandler } from '../utils/responseHelper.js';

const categoryController = {
  getAllCategories: asyncHandler(async (req, res) => {
    const categories = await databaseService.getCategories();
    sendSuccess(res, categories);
  }),

  getCategoryById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await databaseService.getCategoryById(id);
    
    if (!category) {
      return sendNotFound(res, "Category", id);
    }
    
    sendSuccess(res, category);
  }),

  createCategory: asyncHandler(async (req, res) => {
    const { name, visibility, description, year } = req.body;
    
    if (!name) {
      return sendValidationError(res, 'Name is required for a category');
    }
    
    const existingCategories = await databaseService.getCategories();
    const categoryExists = existingCategories.some(cat => cat.name.toLowerCase() === name.toLowerCase());
    
    if (categoryExists) {
      return sendValidationError(res, `Category with name "${name}" already exists`);
    }
    
    const newCategory = {
      id: name.replace(/\s+/g, '-').toLowerCase(),
      name,
      visibility: visibility || 'Show',
      description: description || '',
      year: year || null
    };
    
    const createdCategory = await databaseService.createCategory(newCategory);
    sendSuccess(res, createdCategory, 201);
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, visibility, description, year } = req.body;
    
    if (!name && !visibility && !description && year === undefined) {
      return sendValidationError(res, 'At least one field (name, visibility, description, or year) is required for update');
    }
    
    const category = await databaseService.getCategoryById(id);
    if (!category) {
      return sendNotFound(res, "Category", id);
    }
    
    if (name && name !== category.name) {
      const existingCategories = await databaseService.getCategories();
      const categoryExists = existingCategories.some(cat => 
        cat.id !== id && cat.name.toLowerCase() === name.toLowerCase()
      );
      
      if (categoryExists) {
        return sendValidationError(res, `Category with name "${name}" already exists`);
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (visibility) updateData.visibility = visibility;
    if (description !== undefined) updateData.description = description;
    if (year !== undefined) updateData.year = year;
    
    const updatedCategory = await databaseService.updateCategory(id, updateData);
    sendSuccess(res, updatedCategory);
  }),

  deleteCategory: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const category = await databaseService.getCategoryById(id);
    if (!category) {
      return sendNotFound(res, "Category", id);
    }
    
    const parameters = await databaseService.getParametersByCategoryId(id);
    await databaseService.deleteCategory(id);
    
    sendSuccessWithMessage(res, {
      deletedCategory: category,
      deletedParameters: parameters,
      parameterCount: parameters.length
    }, `Category '${category.name}' deleted successfully`);
  })
};

export default categoryController;