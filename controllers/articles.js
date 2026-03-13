const Articles = require('../models/article');
const NotFoundError = require('../errors/NotFoundError');
const ForbiddenError = require('../errors/ForbiddenError');
const {
  msgOfErrorNotFoundArticle,
  msgOfErrorForbidden,
} = require('../utils/errorsMsgs');
const handleAsync = require('../utils/asyncHandlerControllers');

// Retorna todos os artigos salvos pelo usuário
const getUserArticles = async (req, res) => {
  const userArticles = await Articles.find({ owner: req.user._id });

  // .find() retorna sempre array (pode ser vazio)
  // Não usar .orFail() aqui, pois "nenhum artigo salvo" não é erro

  res.send({ userArticles });
};

// Salva artigo para o usuário:
// - se já existir (mesmo link), apenas adiciona o usuário ao array owner
// - se não existir, cria o artigo com owner = [userId]
const postUserArticles = async (req, res) => {
  const { tag, title, description, publishedAt, source, url, urlToImage } =
    req.body;

  const isAlreadySaved = await Articles.findOneAndUpdate(
    { link: url },
    { $addToSet: { owner: req.user._id } }, // adiciona e evita duplicar o mesmo userId
    { new: true, runValidators: true },
  );

  if (isAlreadySaved) {
    return res.send(isAlreadySaved);
  }

  const savedArticle = await Articles.create({
    keyword: tag,
    title,
    text: description,
    date: publishedAt,
    source,
    link: url,
    image: urlToImage,
    owner: [req.user._id],
  });

  return res.status(201).send(savedArticle);
};

// Remove um artigo salvo pelo usuário:
// - se o artigo tiver apenas 1 owner (o usuário), apaga o documento
// - se tiver mais owners, apenas remove o usuário do array owner
const deleteUserArticles = async (req, res) => {
  const articleToUnsave = await Articles.findById(req.params.articleId)
    .select('+owner') // owner é select:false no schema; aqui é preciso validar permissão
    .orFail(() => {
      throw new NotFoundError(`${msgOfErrorNotFoundArticle}`);
    });

  // Usuário só pode "unsave" se estiver no array owner
  const isOwner = articleToUnsave.owner.some((id) => {
    return id.equals(req.user._id);
  });

  if (!isOwner) {
    throw new ForbiddenError(`${msgOfErrorForbidden}`);
  }

  if (articleToUnsave.owner.length === 1) {
    const deletedArticle = await Articles.findByIdAndDelete(
      req.params.articleId,
    );

    return res.send({ deletedArticle });
  }

  const unsavedArticle = await Articles.findByIdAndUpdate(
    req.params.articleId,
    { $pull: { owner: req.user._id } }, // mongoose faz casting da string, mas pode ser
    // padronizado na autenticação, com: req.user._id = new mongoose.Types.ObjectId
    // (payload._id);
    { new: true, runValidators: true },
  );
  return res.send({ unsavedArticle });
};

module.exports = {
  getUserArticles: handleAsync(getUserArticles),
  postUserArticles: handleAsync(postUserArticles),
  deleteUserArticles: handleAsync(deleteUserArticles),
};
